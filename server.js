const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // 将Socket.IO绑定到服务器

// 设置静态文件目录
app.use(express.static('public'));

// 跟踪乐器选择
let instrumentSelections = {
    GUITAR: null,
    KEYBOARD: null,
    DRUM: null
};

io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    // 在连接时发送当前乐器选择状态
    socket.emit('instrumentStatus', instrumentSelections);

    socket.on('selectInstrument', (instrument) => {
        console.log(`Instrument selected: ${instrument} by ${socket.id}`);
        // 检查乐器是否已被选择
        if (instrumentSelections[instrument] === null) {
            instrumentSelections[instrument] = socket.id; // 标记选择了乐器的用户
            io.emit('instrumentStatus', instrumentSelections); // 更新所有客户端的乐器状态
        }
    });

    socket.on('disconnect', () => {
        // 用户断开连接时，释放他们选择的乐器
        for (let instrument in instrumentSelections) {
            if (instrumentSelections[instrument] === socket.id) {
                instrumentSelections[instrument] = null;
            }
        }
        io.emit('instrumentStatus', instrumentSelections); // 更新所有客户端的乐器状态
        console.log('Updated instrument selections:', instrumentSelections);
    });
    
    // 处理自定义事件
    socket.on('guitarLeft', () => {
        // 广播消息给所有客户端，除了发送者
        socket.broadcast.emit('guitarLeft');
        console.log('guitarLeft');
    });
    socket.on('guitarRight', () => {
        // 广播消息给所有客户端，除了发送者
        socket.broadcast.emit('guitarRight');
        console.log('guitarRight');
    });
    socket.on('keyboardLeft', () => {
        // 广播消息给所有客户端，除了发送者
        socket.broadcast.emit('keyboardLeft');
        console.log('keyboardLeft');
    });
    socket.on('keyboardRight', () => {
        // 广播消息给所有客户端，除了发送者
        socket.broadcast.emit('keyboardRight');
        console.log('keyboardRight');
    });
    socket.on('drumLeft', () => {
        // 广播消息给所有客户端，除了发送者
        socket.broadcast.emit('drumLeft');
        console.log('drumLeft');
    });
    socket.on('drumRight', () => {
        // 广播消息给所有客户端，除了发送者
        socket.broadcast.emit('drumRight');
        console.log('drumRight');
    });
});

// 监听端口
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // 确保你有一个index.html页面或者修改为现有的页面
});

// 乐器选择页面路由
app.get('/instrument', (req, res) => {
    res.sendFile(__dirname + '/public/instrument.html');
});

// 直播页面路由
app.get('/live', (req, res) => {
    res.sendFile(__dirname + '/public/live.html');
});

