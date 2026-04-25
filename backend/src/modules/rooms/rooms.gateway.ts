import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, forwardRef, Inject, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { DebateService } from './debate.service';
import { AchievementsService } from '@/modules/achievements/achievements.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
})
export class RoomsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private isServerReady = false;

  private readonly logger = new Logger(RoomsGateway.name);

  // 存储房间内的用户连接信息
  private roomUsers: Map<
    string,
    Map<string, { socketId: string; userId?: number; isOwner: boolean }>
  > = new Map();

  // 简单的房间内聊天消息内存缓存（仅最近 N 条）
  private roomMessages: Map<
    string,
    {
      id: number;
      roomId: number;
      senderId: number;
      content: string;
      createdAt: string;
    }[]
  > = new Map();

  // 房间投票（按用户去重）：roomKey -> (userId -> agentId)
  private roomVotes: Map<string, Map<number, string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DebateService))
    private readonly debateService: DebateService,
    @Optional() private readonly achievementsService?: AchievementsService,
  ) {
    this.logger.log('🚀 RoomsGateway constructor called');
  }

  /**
   * 确保当前 Socket 关联了已认证用户
   * 如果没有 userId，会尝试根据握手中的 token 重新解析
   */
  private async ensureAuthenticatedUser(client: Socket): Promise<number> {
    if (client.data.userId) {
      return Number(client.data.userId);
    }

    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization
        ?.toString()
        .replace('Bearer ', '');

    if (!token) {
      throw new Error('请先登录');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const rawId = (payload as any).sub ?? (payload as any).id;
      const userId =
        typeof rawId === 'string' ? parseInt(rawId, 10) : Number(rawId);
      client.data.userId = userId;
      this.logger.log(`User ${userId} authenticated (lazy)`);
      return userId;
    } catch (error: any) {
      this.logger.warn(
        `JWT verification failed in ensureAuthenticatedUser: ${error?.message || error}`,
      );
      // 直接抛出原始错误信息（例如 jwt expired），方便前端做针对性处理
      throw new Error(error?.message || '认证失败');
    }
  }

  afterInit(server: Server) {
    this.isServerReady = true;
    this.server = server;
    this.logger.log('🎯 WebSocket Gateway initialized successfully!');
    this.logger.log(`📡 Socket.IO server is ready`);
    this.logger.log(`🔌 Listening on all configured origins`);

    // 打印 Socket.IO 服务器信息
    if (server && (server as any).engine) {
      this.logger.log(`✅ Socket.IO Engine initialized`);
    } else {
      this.logger.warn('⚠️ Socket.IO Engine not found!');
    }
  }

  /**
   * 客户端连接时触发
   */
  async handleConnection(client: Socket) {
    this.logger.log(`✅ Client connected: ${client.id}`);

    // 从握手中获取 token
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        const rawId = (payload as any).sub ?? (payload as any).id;
        const userId =
          typeof rawId === 'string' ? parseInt(rawId, 10) : Number(rawId);
        client.data.userId = userId;
        this.logger.log(`User ${client.data.userId} authenticated`);
      } catch (error) {
        this.logger.warn(`JWT verification failed: ${error.message}`);
      }
    }
  }

  /**
   * 客户端断开连接时触发
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 从所有房间中移除该用户
    this.roomUsers.forEach((users, roomId) => {
      if (users.has(client.id)) {
        const info = users.get(client.id);
        users.delete(client.id);

        // 广播用户离开事件
        this.server.to(roomId).emit('userLeft', {
          socketId: client.id,
          userId: info?.userId,
          onlineCount: users.size,
        });

        this.logger.log(`User left room ${roomId}, online: ${users.size}`);
      }
    });
  }

  /**
   * 用户加入房间
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; ownerId?: number },
  ) {
    // 未登录用户不允许加入房间，不计入在线人数
    const userId = await this.ensureAuthenticatedUser(client).catch(
      (error: any) => {
        // 向前端返回具体错误信息（例如 jwt expired）
        throw new Error(error?.message || '请先登录');
      },
    );

    const roomId = `room_${data.roomId}`;
    const isOwner = !!(data.ownerId && userId === data.ownerId);

    // 加入 Socket.io 房间
    await client.join(roomId);

    // 记录用户信息（按 userId 去重，避免刷新造成重复计数）
    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Map());
    }

    const roomUserMap = this.roomUsers.get(roomId)!;

    // 删除同一用户在该房间内的旧连接（例如刷新页面留下的旧 socket）
    for (const [socketId, info] of roomUserMap.entries()) {
      if (info.userId === userId && socketId !== client.id) {
        roomUserMap.delete(socketId);
      }
    }

    roomUserMap.set(client.id, {
      socketId: client.id,
      userId,
      isOwner,
    });

    // 通知用户加入成功
    client.emit('joinedRoom', {
      roomId: data.roomId,
      isOwner,
      onlineCount: roomUserMap.size,
    });

    // 发送房间历史聊天记录（仅给当前加入的用户）
    const history = this.roomMessages.get(roomId) || [];
    client.emit('chatHistory', history);

    // 广播给房间内其他用户
    client.to(roomId).emit('userJoined', {
      userId,
      onlineCount: roomUserMap.size,
    });

    this.logger.log(
      `User ${userId || 'anonymous'} joined room ${roomId} (owner: ${isOwner}), online: ${roomUserMap.size}`,
    );

    return { success: true, onlineCount: roomUserMap.size };
  }

  /**
   * 用户离开房间
   */
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    const roomId = `room_${data.roomId}`;

    await client.leave(roomId);

    const roomUserMap = this.roomUsers.get(roomId);
    if (roomUserMap) {
      const info = roomUserMap.get(client.id);
      roomUserMap.delete(client.id);

      // 广播用户离开
      this.server.to(roomId).emit('userLeft', {
        socketId: client.id,
        userId: info?.userId,
        onlineCount: roomUserMap.size,
      });
    }

    this.logger.log(`User left room ${roomId}`);
    return { success: true };
  }

  /**
   * 获取房间在线人数
   */
  getRoomOnlineCount(roomId: number): number {
    const roomKey = `room_${roomId}`;
    return this.roomUsers.get(roomKey)?.size || 0;
  }

  /**
   * 投票
   */
  @SubscribeMessage('vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; agentId: string },
  ) {
    const userId = await this.ensureAuthenticatedUser(client);

    const roomKey = `room_${data.roomId}`;
    const voteMap = this.roomVotes.get(roomKey) || new Map<number, string>();
    voteMap.set(userId, data.agentId);
    this.roomVotes.set(roomKey, voteMap);

    // 持久化投票（同一用户同一房间可覆盖更新）
    await this.prisma.vote.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId: data.roomId,
        },
      },
      update: {
        agentId: data.agentId,
      },
      create: {
        userId,
        roomId: data.roomId,
        agentId: data.agentId,
      },
    });

    this.achievementsService?.checkVoteAchievements(userId).catch(() => {});

    const counts: Record<string, number> = {};
    for (const agentId of voteMap.values()) {
      counts[agentId] = (counts[agentId] || 0) + 1;
    }
    const totalVotes = voteMap.size;

    // 广播投票更新
    this.server.to(roomKey).emit('voteUpdate', {
      agentId: data.agentId,
      userId,
      counts,
      totalVotes,
    });

    this.logger.log(
      `User ${userId} voted for ${data.agentId} in room ${data.roomId}`,
    );
    return { success: true, counts, totalVotes, myVote: data.agentId };
  }

  /**
   * 发送人类消息
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; content: string },
  ) {
    const userId = await this.ensureAuthenticatedUser(client);

    const roomKey = `room_${data.roomId}`;
    const messagePayload = {
      id: Date.now(),
      roomId: data.roomId,
      senderId: userId,
      content: data.content,
      createdAt: new Date().toISOString(),
    };

    // 广播消息给房间内所有用户
    this.server.to(roomKey).emit('newMessage', messagePayload);

    // 写入内存缓存（只保留最近 100 条）
    const prev = this.roomMessages.get(roomKey) || [];
    const next = [...prev, messagePayload].slice(-100);
    this.roomMessages.set(roomKey, next);

    // 若处于观点征集窗口，异步写入 UserOpinion 表
    if (this.debateService.isCollectingOpinions(data.roomId)) {
      (this.prisma as any).userOpinion
        .create({
          data: {
            roomId: data.roomId,
            userId,
            content: data.content.slice(0, 200),
            stance: 'NEUTRAL',
            isRelevant: true,
          },
        })
        .catch((e: any) =>
          this.logger.warn(`UserOpinion write failed: ${e?.message}`),
        );
    }

    this.logger.log(`User ${userId} sent message in room ${data.roomId}`);
    return { success: true };
  }

  /**
   * 广播消息到指定房间
   */
  broadcastToRoom(roomId: number, event: string, data: any) {
    const roomKey = `room_${roomId}`;
    this.server.to(roomKey).emit(event, data);
  }
}
