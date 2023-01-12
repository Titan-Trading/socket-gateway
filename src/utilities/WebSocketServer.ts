import {Server} from 'socket.io';
import {Server as ServerEngineDev} from 'ws';
// import {Server as ServerEngine} from 'eiows';
import JsonParser from 'socket.io-json-parser';
import {createAdapter} from "@socket.io/redis-adapter";
import {createClient} from "redis";
import http from 'http';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import PubSub from './PubSub';
import UserRepository from '../repositories/UserRepository';
import e from 'cors';
import RestAPI from './RestAPI';


/**
 * Web Socket server (socket.io)
 * - update time series database from ticker, trades aggregated and individual trades (if supported) streams
 * - update clients with trade statuses
 * - update trading workers when new bot session or conditional trade is added or updated
 * - update trading workers when a new algorithm (bot or conditional trade) is added or updated
 */

export default class WebSocketServer
{
    private _eventBus: PubSub;
    private _users: UserRepository;
    private _restAPI: RestAPI;
    httpServer: http.Server;
    server: Server;

    /**
     * Create new instance of a Web Socket server
     * 
     * @param config Server configuration
     */
    constructor(config: {httpServer: any}, restAPI: RestAPI)
    {
        this._eventBus = new PubSub();

        this._users = new UserRepository();

        this.httpServer = config.httpServer;

        this._restAPI = restAPI;
    }

    /**
     * Start listening for connections
     */
    start(): void
    {
        const context = this;

        // load public key for verifying tokens
        const cert = fs.readFileSync('keys/access-token-public.pem');

        // create new instance of a Web Socket server
        this.server = new Server(this.httpServer, {
            cors: {
                origin: ['https://tradingsystemstest.com', 'https://simpletrader.local', 'http://localhost:3000'],
                methods: ['GET', 'POST'],
                allowedHeaders: '*',
                exposedHeaders: ['Content-Type', 'Origin']
            },
            // wsEngine: ServerEngine,
            wsEngine: ServerEngineDev,
            parser: JsonParser,
            perMessageDeflate: {
                threshold: 32768
            }
        });

        const pubClient = createClient({ 
            url: process.env.REDIS_HOST,
            password: process.env.REDIS_PASSWORD
        });
        const subClient = pubClient.duplicate();

        Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
            context.server.adapter(createAdapter(pubClient, subClient));
        });

        // authentication middleware
        this.server.use(async (socket, next) => {
            // no access token found
            if(!socket.handshake.auth || !socket.handshake.auth.token) {
                console.log('System: no connect token found');
                
                return next(new Error('No connect token found'));
            }

            try {
                const authConnectToken = socket.handshake.auth.token;

                const decoded = await jwt.verify(authConnectToken, cert, {
                    algorithms: ['RS512'],
                    audience: 'simple-trader'
                });

                // socket is not linked to a user yet
                if(!context._users.getBySocketId(socket.id)) {
                    const userMetadata = decoded.metadata;
                    // check the rest api to see if the token is valid and if the user exists
                    context._users.update(socket.id, userMetadata.user_id, userMetadata.name, userMetadata.email);
                }
            }
            catch(err) {
                console.log('System: auth token invalid');

                return next(err);
            }

            return next();
        });

        // when a socket connection is made to the server
        this.server.on('connection', function(socket) {
            // get user once authenticated
            const user = context._users.getBySocketId(socket.id);
            if(!user) {
                console.log('User not found');
                socket.disconnect(true);
            }

            // call connected callback method
            context._eventBus.emit('onConnect', {socket, user});
            
            // when a socket connection sends a message
            socket.on('message', (message) => {
                context._eventBus.emit('onMessage', {
                    socket,
                    message
                });
            });

            // when a socket requests to join a room
            socket.on('join_channel', async (room) => {
                const user = context._users.getBySocketId(socket.id);

                const roomParts = room.split(':');

                // public channels accessible to everyone
                if(!roomParts.length || roomParts.length !== 3 || roomParts[0] == 'EXCHANGE_DATA') {
                    console.log('System: client joined room ' + room);
                    socket.join(room);
                    socket.emit('channel_joined', 'Joined channel: ' + room);
                    return;
                }

                // private channels
                // check if user can join the room
                switch(roomParts[0]) {
                    case 'EXCHANGE_ACCOUNT_DATA':
                        // is the exchange account connected to the current user
                        let exchangeAccountRes = await context._restAPI.getExchangeAccount(roomParts[2]);
                        if(exchangeAccountRes.user_id === user.userId) {
                            console.log('System: client joined room ' + room);
                            socket.join(room);
                            socket.emit('channel_joined', 'Joined channel: ' + room);
                        }

                        break;
                    case 'STRATEGY_BUILDER':
                        // is the strategy owned by the current user
                        let botRes = await context._restAPI.getBot(roomParts[2]);
                        if(botRes.user_id === user.userId) {
                            if(roomParts[1] == '*') {
                                const rooms = [
                                    'STRATEGY_BUILDER:ERROR:' + roomParts[2],
                                    'STRATEGY_BUILDER:BUILD_COMPLETED:' + roomParts[2]
                                ];
                                for(let iR in rooms) {
                                    const r = rooms[iR];
                                    console.log('System: client joined room ' + r);
                                    socket.join(r);
                                    socket.emit('channel_joined', 'Joined channel: ' + r);
                                }
                            }
                            else {
                                console.log('System: client joined room ' + room);
                                socket.join(room);
                                socket.emit('channel_joined', 'Joined channel: ' + room);
                            }
                        }
                        break;
                    case 'BACKTEST_SESSION':
                        // is the backtest session owned by the current user
                        const idParts = roomParts[2].split(',');
                        let botSessionRes = await context._restAPI.getBotSession(idParts[0], idParts[1]);
                        if(botSessionRes.user_id === user.userId) {
                            if(roomParts[1] == '*') {
                                const rooms = [
                                    'BACKTEST_SESSION:ERROR:' + roomParts[2],
                                    'BACKTEST_SESSION:START_SESSION:' + roomParts[2],
                                    'BACKTEST_SESSION:UPDATE_SESSION:' + roomParts[2],
                                    'BACKTEST_SESSION:SESSION_COMPLETED:' + roomParts[2]
                                ];
                                for(let iR in rooms) {
                                    const r = rooms[iR];
                                    console.log('System: client joined room ' + r);
                                    socket.join(r);
                                    socket.emit('channel_joined', 'Joined channel: ' + r);
                                }
                            }
                            else {
                                console.log('System: client joined room ' + room);
                                socket.join(room);
                                socket.emit('channel_joined', 'Joined channel: ' + room);
                            }
                        }
                        break;
                    case 'INDICATOR_BUILDER':
                        // is the indicator owned by the current user
                        let indicatorRes = await context._restAPI.getIndicator(roomParts[2]);
                        if(indicatorRes.user_id === user.userId) {
                            if(roomParts[1] == '*') {
                                const rooms = [
                                    'INDICATOR_BUILDER:ERROR:' + roomParts[2],
                                    'INDICATOR_BUILDER:BUILD_COMPLETED:' + roomParts[2]
                                ];
                                for(let iR in rooms) {
                                    const r = rooms[iR];
                                    console.log('System: client joined room ' + r);
                                    socket.join(r);
                                    socket.emit('channel_joined', 'Joined channel: ' + r);
                                }
                            }
                            else {
                                console.log('System: client joined room ' + room);
                                socket.join(room);
                                socket.emit('channel_joined', 'Joined channel: ' + room);
                            }
                        }
                        break;
                    case 'INDICATOR_TEST':
                        // is the indicator test owned by the current user
                        break;
                    case 'LIVE_TRADE_SESSION':
                        // is the live trading session owned by the current user
                        break;
                }
            });

            // when there is an error on a socket connection
            socket.on('error', (err) => {
                context._eventBus.emit('onError', {
                    socket,
                    error: err
                });
            });

            // when a socket connection is closed
            socket.on('disconnect', () => {
                socket.disconnect(true);
                
                // get user once authenticated
                const user = context._users.getBySocketId(socket.id);
                if(!user) {
                    console.log('User not found');
                    return;
                }

                context._eventBus.emit('onDisconnect', {socket, user});

                context._users.remove(socket.id);
            });

        });
    }

    /**
     * Stop listening for connections and disconnect all connected sockets
     */
    stop(): void
    {
        this.server.close();
    }

    /**
     * When a new client is connected
     * 
     * @param callback 
     */
    onConnect(callback: ({socket, user}) => void): void
    {
        this._eventBus.on('onConnect', callback);
    }

    /**
     * When a client is disconnected
     * 
     * @param callback 
     */
    onDisconnect(callback: ({socket, user}) => void): void
    {
        this._eventBus.on('onDisconnect', callback);
    }

    /**
     * When a message is received from a client
     * 
     * @param callback 
     */
    onMessage(callback: ({socket, message}) => void): void
    {
        this._eventBus.on('onMessage', callback);
    }

    /**
     * When there is an error with a client
     * 
     * @param callback 
     */
    onError(callback: ({socket, error}) => void): void
    {
        this._eventBus.on('onError', callback);
    }
}