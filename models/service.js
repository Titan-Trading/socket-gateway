'use strict';

const {Sequelize, Model} = require('sequelize');
const ServiceInstanceFactory = require('./serviceinstance');
const EndpointFactory = require('./endpoint');

module.exports = (sequelize) => {
    class Service extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }
    Service.init({
        name: {
            type: Sequelize.STRING,
            field: 'name'
        },
        supportedCommunicationChannels: {
            type: Sequelize.STRING,
            field: 'supported_communication_channels',
            allowNull: true,
            get() {
                return this.getDataValue('supportedCommunicationChannels').split(';')
            },
            set(val) {
                this.setDataValue('supportedCommunicationChannels', val.join(';'));
            }
        },
        hostname: {
            allowNull: true,
            type: Sequelize.STRING,
            field: 'hostname'
        },
        port: {
            allowNull: true,
            type: Sequelize.INTEGER,
            field: 'port'
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            field: 'created_at'
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            field: 'updated_at'
        },
    }, {
        sequelize,
        timestamps: true,
        modelName: 'Service',
        tableName: 'services'
    });

    const ServiceInstance = ServiceInstanceFactory(sequelize);
    const Endpoint = EndpointFactory(sequelize);

    Service.hasMany(ServiceInstance, {
        as: 'instances',
        foreignKey: { name: 'serviceId', allowNull: false }
    });

    Service.hasMany(Endpoint, {
        as: 'endpoints',
        foreignKey: { name: 'serviceId', allowNull: false }
    });

    return Service;
};