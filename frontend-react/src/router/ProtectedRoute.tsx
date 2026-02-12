import {ReactNode} from "react";
import {Navigate} from "react-router-dom";
import {useAuthStore} from "@/store";
const ProtectedRoute=({children}:{children:ReactNode})=>{const {isAuthenticated}=useAuthStore();return isAuthenticated?<>{children}</>:<Navigate to="/login"/>};
export default ProtectedRoute;