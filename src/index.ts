// get route registry data 

// set up middleware for converting rest requests to message sagas
    // listens on message queue for responses
    // send 404 when there's no mapping found
    // manage time-outs
    // manage authentication (jwt and api key)

// listens on message queue for route registry updates

require('dotenv').config();

import {v4 as uuidv4} from 'uuid';

import MessageBus from './bus/MessageBus';
import HttpServer from './HttpServer';
import WebSocketServer from './WebSocketServer';
import ServiceRepository from './repositories/ServiceRepository';

const messageBus = new MessageBus(process.env.CLIENT_ID, process.env.GROUP_ID, [process.env.KAFKA_BOOTSTRAP_SERVER]);
const restServer = new HttpServer();
const webSocketServer = new WebSocketServer({
    httpServer: restServer.getServer()
});
const services = new ServiceRepository();

// service id and instance id
const serviceId = process.env.SERVICE_ID;
const instanceId = process.env.INSTANCE_ID;
const serviceRegistryTopic = 'service-registry';

// when service registry has responses
messageBus.onMessage(serviceRegistryTopic, async (data) => {
    // service came online
    if(data.messageType == 'EVENT' && data.eventId == 'SERVICE_ONLINE') {
        console.log('service online: ' + data.serviceId + ' (' + data.instanceId + ')');

        // update route mapping repository
        services.update(data.serviceId, data.serviceId, data.supportedCommunicationChannels, data.hostname, data.port, data.endpoints, data.commands, data.instances);
    }
    // service went offline
    else if(data.messageType == 'EVENT' && data.eventId == 'SERVICE_OFFLINE') {
        console.log('service offline: ' + data.serviceId + ' (' + data.instanceId + ')');

        // update route mapping repository
        services.remove(data.serviceId);
    }
    // entire service list
    else if(data.messageType == 'RESPONSE' && data.queryId == 'SERVICE_LIST') {
        if(typeof data.response === 'undefined') {
            return;
        }
    
        for(let sI in data.response) {
            const service = data.response[sI];
    
            services.update(service.id, service.name, service.supportedCommunicationChannels, service.hostname, service.port, service.endpoints, service.commands, service.instances);
        }
    }
});

// when other services have socket responses (outbound)
messageBus.onMessage(serviceId, async (updateData) => {

    if(updateData) {

    }


    const exampleUserBalanceUpdate = {
        meta: {
            category: 'USER', // EXCHANGE, USER, BOT_SESSION, etc
            type: 'BALANCE_UPDATE'
        },
        data: {
            balance: {
                USD: 0.00,
                BTC: 0.000000000
            }
        }
    }

    // find out which audience the response should be sent to (a room/a namespace/a list of clients/broadcast to all clients)

    // send the response to the client(s)
    // webSocketServer.send();
});

// connect to message bus
messageBus.connect().then(async () => {
    console.log('connected to message bus');

    // let the service registry know that a new micro-service is online
    await messageBus.sendEvent(serviceRegistryTopic, 'SERVICE_ONLINE', {
        instanceId,
        serviceId,
        supportedCommunicationChannels: ['bus'],
        hostname: 'socket-gateway-proxy',
        port: 8080,
        endpoints: [],
        commands: []
    });

    // setup mapping endpoints to inbound event channel repository
    await messageBus.sendQuery(serviceRegistryTopic, 'SERVICE_LIST', {});
});

// when client connects to the web socket server
webSocketServer.onConnect((socket) => {
    console.log(socket.id);

    // add to repository of connected clients
});

// when a client sends a message (inbound)
webSocketServer.onMessage((socket, message) => {
    console.log(socket.id);
    console.log(message);

    const messageCategory = message.meta.category;
    const messageType = message.meta.type;

    // find service to route the incoming message using category and message type

    // route incoming message to service using preferred method of communication (rest or message bus)

    // check for a mapping in mapping repository
    const service = services.getByMessage(messageCategory, messageType);
    if(!service) {
        // return res.status(404).send('Not found');

        // send response back to the client (service not found or command not supported)
    }

    console.log('Service found:', service.name);

    // send http request or message bus message
    if(service.supportedCommunicationChannels.includes('bus')) {
        // messageBus.sendRequest(service.name, routeId, requestId, {
        //     gatewayId: instanceId,
        //     method,
        //     endpoint: url,
        //     data: req.body
        // });
    }
    else if(service.supportedCommunicationChannels.includes('rest')) {
        // const requestHeaders = req.headers;
        // const requestBody = req.body ? req.body : null;

        // const proxiedRes = await restProxy.sendRequest(method, service.hostname + ':' + service.port + url, requestBody, requestHeaders);

        // // clear the timeout for the current incoming request
        // clearTimeout(requestTimeout);

        // if(!proxiedRes) {
        //     return res.status(404).send('Not found');
        // }

        // return res.status(proxiedRes.statusCode).json(proxiedRes.body);
    }
});

// start web socket service (piggy-backs http server)
webSocketServer.start();

// start http/rest service
restServer.start(process.env.REST_PORT);

/**
 * Closed on error/generic
 */
 process.on('SIGTERM', async () => {
    console.info('SIGTERM signal received.');

    // let the service registry know that a micro-service is offline
    await messageBus.sendEvent(serviceRegistryTopic, 'SERVICE_OFFLINE', {
        instanceId,
        serviceId
    });

    await messageBus.disconnect();
    
    webSocketServer.stop();
    restServer.stop();

    console.log('message for service going offline sent');

    process.exit(0);
});

/**
 * Closed with keypress ctrl+c
 */
process.on('SIGINT', async () => {
    console.info('SIGINT signal received.');

    // let the service registry know that a micro-service is offline
    await messageBus.sendEvent(serviceRegistryTopic, 'SERVICE_OFFLINE', {
        instanceId,
        serviceId
    });

    await messageBus.disconnect();

    webSocketServer.stop();
    restServer.stop();

    console.log('message for service going offline sent');

    process.exit(0);
});