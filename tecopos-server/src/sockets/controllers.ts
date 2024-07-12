import { Socket } from "socket.io";

export const socketController = (socket: Socket) => {
    //Manage user conected
    // console.log("Cliente conectado", socket.id);

    //Manage user disconected
    socket.on("disconnect", () => {
        // console.log("Cliente desconectado", socket.id);
    });

    //Joining room
    socket.on("join", room => {
        // console.log(`client connect to ${room}`);
        socket.join(room);
    });

    //Leaving the room
    socket.on("leave", room => {
        // console.log(`client disconnet from ${room}`);
        socket.leave(room);
    });

    // socket.on("enviar-mensaje", (payload, callback) => {
    //     const id = 123456789;
    //     callback(id);

    //     socket.broadcast.emit("enviar-mensaje", payload);
    // });
};
