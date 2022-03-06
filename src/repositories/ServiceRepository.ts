

export default class ServiceRepository
{
    services = {};

    constructor() {

    }

    getAll()
    {
        return this.services;
    }

    getByMessage(category, type)
    {
        for(let sI in this.services) {
            const service = this.services[sI];

            for(let cI in service.commands) {
                const command = service.commands[cI];
                const commandCategory = command.category;
                const commandType = command.type;

                if(category !== commandCategory) {
                    continue;
                }
                if(type !== commandType) {
                    continue;
                }

                return service;
            }
        }

        return null;
    }

    setAll(services)
    {
        for(let sI in services) {
            const service = services[sI];

            this.services[service.id] = service;
        }
    }

    update(id, name, supportedCommunicationChannels, hostname, port, endpoints, commands, instances)
    {
        if(typeof this.services[id] === 'undefined') {
            this.services[id] = {};
        }

        this.services[id] = {
            id,
            name,
            supportedCommunicationChannels,
            hostname,
            port,
            endpoints,
            commands,
            instances
        };

        // console.log('add or update service endpoints', this.services[id]);

        return true;
    }

    remove(id)
    {
        let newServices = {};
        for(let sI in this.services) {
            if(this.services[sI].id == id) {
                continue;
            }

            newServices[sI] = this.services[sI];
        }

        this.services = newServices;

        // console.log('endpoints removed: ', this.services);

        return true;
    }
}