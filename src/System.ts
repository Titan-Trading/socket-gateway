
/**
 * System class that controls everything
 */
import {v4 as uuidv4} from 'uuid';
import ServiceRepository from "./repositories/ServiceRepository";
import HttpServer from "./utilities/HttpServer";
import Log from './utilities/Log';
import MessageBus from "./utilities/MessageBus";
import RestAPI from './utilities/RestAPI';
import WebSocketServer from "./utilities/WebSocketServer";


export default class System
{
    private _messageBus: MessageBus;
    private _httpServer: HttpServer;
    private _socketServer: WebSocketServer;
    private _repos: {services: ServiceRepository};
    private _restAPI: RestAPI;
    private _log: Log;

    constructor()
    {
        // load configurations
        // load configurations
        const restAPIURL = process.env.REST_API_URL ? process.env.REST_API_URL : 'http://localhost:9000/api';
        const restAPIKey = process.env.REST_API_KEY ? process.env.REST_API_KEY : '';
        const restAPIKeySecret = process.env.REST_API_KEY_SECRET ? process.env.REST_API_KEY_SECRET : '';

        this._messageBus = new MessageBus(process.env.CLIENT_ID, process.env.GROUP_ID, [process.env.KAFKA_BOOTSTRAP_SERVER]);

        // create REST API instance (ours)
        this._restAPI = new RestAPI(restAPIURL, restAPIKey, restAPIKeySecret);

        this._httpServer = new HttpServer();
        this._socketServer = new WebSocketServer({httpServer: this._httpServer.getServer()}, this._restAPI);

        this._log = new Log(this._messageBus);
        
        this._repos = {
            services: new ServiceRepository()
        };
    }

    /**
     * Start the system
     * 
     * - get all initialization data from rest API
     * - start connection to message bus
     * - start client connections to all exchanges
     */
    async start(): Promise<boolean>
    {
        const context = this;

        console.log('System: starting...');

        return new Promise(async (resolve, reject) => {
            try {

                // when service registry has responses (inbound and outbound)
                context._messageBus.onMessage('service-registry', async (data) => {
                    // service came online
                    if(data.messageType == 'EVENT' && data.eventId == 'SERVICE_ONLINE') {
                        console.log('System: service online ' + data.serviceId + ' (' + data.instanceId + ')');
                        // context._log.info(`System: service online ${data.serviceId} (instance ${data.instanceId})`);

                        // update route mapping repository
                        const updated = context._repos.services.update(data.serviceId, data.serviceId, data.supportedCommunicationChannels, data.hostname, data.port, data.endpoints, data.commands, data.instances);
                    }
                    // service went offline
                    else if(data.messageType == 'EVENT' && data.eventId == 'SERVICE_OFFLINE') {
                        console.log('System: service offline ' + data.serviceId + ' (' + data.instanceId + ')');
                        // context._log.info(`System: service offline ${data.serviceId} (instance ${data.instanceId})`);

                        // update route mapping repository
                        const removed = context._repos.services.remove(data.serviceId);
                    }
                    // entire service list
                    else if(data.messageType == 'RESPONSE' && data.queryId == 'SERVICE_LIST') {
                        if(typeof data.response === 'undefined') {
                            return;
                        }
                    
                        for(let sI in data.response) {
                            const service = data.response[sI]; 
                    
                            const updated = context._repos.services.update(service.id, service.name, service.supportedCommunicationChannels, service.hostname, service.port, service.endpoints, service.commands, service.instances);
                            if(updated && service.name != process.env.SERVICE_ID) {
                                // console.log('System: service updated ' + service.name + ' (' + service.instances.length + ' instances)');
                                context._log.info(`System: service online ${service.name} (${service.instances.length} instances)`);
                            }
                        }
                    }
                });

                // when other services have socket responses (outbound from service)
                /*messageBus.onMessage(serviceId, async (updateData) => {

                    console.log(serviceId, updateData);

                    // find out which audience the response should be sent to (a room/a namespace/a list of clients/broadcast to all clients)

                });*/

                // connect to message bus
                console.log('System: connecting to message bus...');
                context._messageBus.connect().then(async () => {
                    console.log('System: connected to message bus');

                    // let the service registry know that a new micro-service is online
                    context._messageBus.sendEvent('service-registry', 'SERVICE_ONLINE', {
                        instanceId: process.env.INSTANCE_ID,
                        serviceId:  process.env.SERVICE_ID,
                        supportedCommunicationChannels: ['rest', 'bus', 'socket'],
                        hostname: 'socket-gateway-proxy',
                        port: 8001,
                        endpoints: [],
                        commands: []
                    });

                    // setup mapping endpoints to inbound event channel repository
                    context._messageBus.sendQuery('service-registry', 'SERVICE_LIST', {});
                });

                // when client connects to the web socket server
                context._socketServer.onConnect(({socket, user}) => {
                    if(!user || typeof user.name == 'undefined') {
                        return;
                    }

                    console.log('System: user ' + user.name + ' is connected');
                    // context._log.info(`System: socket (user ${user.name}) is connected`);
                });

                // when client connects to the web socket server
                context._socketServer.onError(({socket, error}) => {
                    console.log('System: error ', error);
                    // context._log.info(`System: socket error: ${JSON.stringify(error)}`);
                });

                // when client connects to the web socket server
                context._socketServer.onDisconnect(({socket, user}) => {
                    if(!user || typeof user.name == 'undefined') {
                        return;
                    }

                    console.log('System: user ' + user.name + ' is disconnected');
                    // context._log.info(`System: socket (user ${user.name}) is disconnected`);
                });


                // when a client sends a message (inbound) or when a service sends a message (outbound)
                context._socketServer.onMessage(({socket, message}) => {
                    const messageCategory = message.meta.category; // the category/service/resource
                    const messageType = message.meta.type; // the type of data contained

                    message.meta.serverTimestamp = +new Date();

                    // messages coming from a service (inbound messages)
                    if(typeof message.meta.direction !== 'undefined' && message.meta.direction === 'inbound') {
                        // find service to route the incoming message using category and message type
                        // route incoming message to service using preferred method of communication (rest or message bus)
                        // check for a mapping in mapping repository
                        const service = context._repos.services.getByMessage(messageCategory, messageType);
                        if(!service) {
                            // context._log.info(`System: request to service that's not found (category ${messageCategory} type ${messageType})`);

                            // send response back to the client (service not found or command not supported)
                            return socket.emit('message', {
                                errorCode: 404,
                                code: 'SERVICE_NOT_FOUND',
                                message: 'Unable to find a service to process request'
                            });
                        }

                        console.log('System: service found ' + service.name);
                        // context._log.info(`System: service found ${service.name}`);

                        // string to identify a route
                        const routeId = messageCategory + '-' + messageType;

                        // string to identify the current request
                        const requestId = routeId + '.' + uuidv4();

                        // start the timeout response timer (if no service responds)
                        // let requestTimeout = setTimeout(() => {
                        //     clearTimeout(requestTimeout);
                        //     requestTimeout = null;

                        //     // send response back to the client (service not found or command not supported)
                        //     return socket.emit('message', {
                        //         errorCode: 404,
                        //         code: '',
                        //         message: 'Unable to find a service to process request'
                        //     });
                        // }, requestTimeoutLimit); // 30 seconds

                        // send http request or message bus message
                        if(service.supportedCommunicationChannels.includes('bus')) {
                            context._messageBus.sendRequest(service.name, routeId, requestId, {
                                gatewayId: process.env.INSTANCE_ID,
                                // method,
                                // endpoint: url,
                                data: message
                            });
                        }
                    }
                    else if(messageCategory === 'EXCHANGE_DATA') {
                        //console.log(message.meta);
                        // console.log(socket.id);
                        // console.log(message);

                        // console.log(messageCategory, messageType, message.data.symbol);

                        // console.log('EXCHANGE_DATA:' + messageType + ':' + message.data.symbol);

                        context._socketServer.server.to('EXCHANGE_DATA:' + messageType + ':' + message.data.symbol).emit('message', message);
                    }
                    else if(messageCategory === 'EXCHANGE_ACCOUNT_DATA') {
                        // get user by account id

                        // send exchange account updates to only that user

                        context._socketServer.server.to('EXCHANGE_ACCOUNT_DATA:' + messageType + ':' + message.data.accountId).emit('message', message);
                    }
                    else if(messageCategory === 'STRATEGY_BUILDER') {
                        console.log(message);

                        switch(messageType) {
                            case 'BUILD_COMPLETED':
                                console.log('build completed', message);
                                // context._log.info(`System: strategy build complete ${JSON.stringify(message)}`);
                                context._socketServer.server.to('STRATEGY_BUILDER:BUILD_COMPLETED:' + message.data.strategy.id).emit('message', message);
                                break;

                            case 'ERROR':
                                context._socketServer.server.to('STRATEGY_BUILDER:ERROR:' + message.data.strategy.id).emit('message', message);
                                break;
                        }
                    }
                    else if(messageCategory === 'BACKTEST_SESSION') {
                        switch(messageType) {
                            case 'START_SESSION':
                                console.log('session started', message);
                                // context._log.info(`System: session started ${JSON.stringify(message)}`);
                                context._socketServer.server.to('BACKTEST_SESSION:START_SESSION:' + message.meta.session._strategyId + ',' + message.meta.session._id).emit('message', message);
                                break;

                            case 'UPDATE_SESSION':
                                console.log('session updated', message);
                                // context._log.info(`System: session update ${JSON.stringify(message)}`);
                                context._socketServer.server.to('BACKTEST_SESSION:UPDATE_SESSION:' + message.meta.session._strategyId + ',' + message.meta.session._id).emit('message', message);
                                break;

                            case 'SESSION_COMPLETED':
                                console.log('session completed', message);
                                // context._log.info(`System: session complete ${JSON.stringify(message)}`);
                                context._socketServer.server.to('BACKTEST_SESSION:SESSION_COMPLETED:' + message.meta.session._strategyId + ',' + message.meta.session._id).emit('message', message);
                                break;

                            case 'ERROR':
                                context._socketServer.server.to('BACKTEST_SESSION:ERROR:' + message.meta.session._strategyId + ',' + message.meta.session.id).emit('message', message);
                                break;
                        }
                    }
                    else if(messageCategory === 'INDICATOR_BUILDER') {
                        console.log(message);

                        switch(messageType) {
                            case 'BUILD_COMPLETED':
                                console.log('build completed', message);
                                // context._log.info(`System: indicator build complete ${JSON.stringify(message)}`);
                                context._socketServer.server.to('INDICATOR_BUILDER:BUILD_COMPLETED:' + message.data.indicator.id).emit('message', message);
                                break;

                            case 'ERROR':
                                context._socketServer.server.to('INDICATOR_BUILDER:ERROR:' + message.data.indicator.id).emit('message', message);
                                break;
                        }
                    }
                });

                // start web socket service (piggy-backs http server)
                context._socketServer.start();

                // start http/rest service
                context._httpServer.start(process.env.REST_PORT);

                resolve(true);
            }
            catch(err) {
                console.log('System error: ', err);
                // context._log.info(`System: error ${JSON.stringify(err)}`);

                resolve(false);
            }
        });
    }

    async stop()
    {
        const context = this;

        try {
            // let the service registry know that a micro-service is offline
            console.log('System: updating service registry (SERVICE_OFFLINE)...');
            // context._log.info(`System: updating service registry (SERVICE_OFFLINE)...`);
            await context._messageBus.sendEvent('service-registry', 'SERVICE_OFFLINE', {
                instanceId: process.env.INSTANCE_ID,
                serviceId:  process.env.SERVICE_ID
            });
            console.log('System: service registry updated');
            // context._log.info(`System: service registry updated`);

            console.log('System: stopping socket server...');
            // context._log.info(`System: stopping socket server...`);
            context._socketServer.stop();
            console.log('System: socket server stopped');
            // context._log.info(`System: socket server stopped`);

            console.log('System: stopping http server...');
            // context._log.info(`System: stopping http server...`);
            context._httpServer.stop();
            console.log('System: http server stopped');
            // context._log.info(`System: http server stopped`);

            console.log('System: disconnecting from message bus...');
            await context._messageBus.disconnect();
            console.log('System: disconnected from message bus');
        }
        catch(err) {
            console.log('System error: ', err);
            // context._log.info(`System error: ${JSON.stringify(err)}`);
            return;
        }
    }
}