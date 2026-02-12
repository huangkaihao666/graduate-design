import {Result, Button} from "antd";
import {useNavigate} from "react-router-dom";
const NotFound=()=>{const navigate=useNavigate();return <div><Result status="404" extra={<Button onClick={()=>navigate("/")}>Back</Button>}/></div>};
export default NotFound;