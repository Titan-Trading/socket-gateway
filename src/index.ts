


// get route registry data 

// set up middleware for converting rest requests to message sagas
    // listens on message queue for responses
    // send 404 when there's no mapping found
    // manage time-outs

// listens on message queue for route registry updates

require('dotenv').config();

import MessageBus from './bus/MessageBus';
import HttpServer from './HttpServer';
import ServiceRepository from './repositories/ServiceRepository';

const messageBus = new MessageBus(process.env.CLIENT_ID, process.env.GROUP_ID, [process.env.KAFKA_BOOTSTRAP_SERVER]);
const restServer = new HttpServer();
const services = new ServiceRepository();

// service name and id
const serviceId = process.env.SERVICE_ID;
const instanceId = process.env.INSTANCE_ID;
const serviceRegistryTopic = 'service-registry';

(async () => {

    // connect to message bus
    messageBus.connect().then(() => {
        // let the service registry know that a new micro-service is online
        console.log('let other service registry instances know we are online');
        messageBus.sendEvent(serviceRegistryTopic, 'SERVICE_ONLINE', {
            instanceId,
            serviceId,
            supportedCommunicationChannels: ['rest', 'bus'],
            hostname: 'registry-proxy',
            port: 8081,
            endpoints: [
                {
                    url: '/services',
                    method: 'get'
                }
            ]
        });
    });

    // setup incoming message channel
    messageBus.onMessage(serviceRegistryTopic, async (data) => {
        // ignore responses
        if(data.messageType == 'RESPONSE') {
            return;
        }

        console.log(data.messageType.toLowerCase() + ' (message bus)', data);

        if(data.messageType == 'EVENT' && data.eventId == 'SERVICE_ONLINE') {

            services.addInstance(data.serviceId, {
                instanceId: data.instanceId,
                supportedCommunicationChannels: data.supportedCommunicationChannels,
                hostname: data.hostname,
                port: data.port,
                endpoints: data.endpoints,
                status: 'online'
            });

            // data.responseCode = 200;
            // data.response = {};

            // // reply to outgoing message channel
            // messageBus.sendMessage(serviceRegistryTopic, data);
        }
        else if(data.messageType == 'EVENT' && data.eventId == 'SERVICE_OFFLINE') {
            
            services.updateInstance(data.instanceId, {
                status: 'offline'
            });

            // data.responseCode = 200;
            // data.response = {};

            // // console.log('services updated (offline): ', await services.getAll());

            // // reply to outgoing message channel
            // messageBus.sendMessage(serviceRegistryTopic, data);
        }
        else if((data.messageType == 'QUERY' && data.queryId == 'SERVICE_LIST') || (data.messageType == 'REQUEST' && data.routeId && data.routeId == 'get-/services')) {
            data.messageType = 'RESPONSE';
            data.responseCode = 200;
            data.response = await services.getAll();

            // console.log('get all services', data.response);

            // reply to outgoing message channel
            messageBus.sendMessage(serviceRegistryTopic, data);
        }
    });

    // when a request is sent to the HTTP server
    restServer.on('get', '/services', async (req, res) => {
        console.log('got a request');
        console.log('perform transaction on personal database');
        console.log('send reply');

        const allServices = await services.getAll();

        return res.status(200).json(allServices);
    });

    // start http/rest service
    restServer.start(process.env.REST_PORT);
})();

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

    console.log('message for service going offline sent');

    process.exit(0);
});