'use strict';

const {Sequelize, Model} = require('sequelize');

module.exports = (sequelize) => {
    class ServiceInstance extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    ServiceInstance.init({
        serviceId: {
          type: Sequelize.INTEGER,
          field: 'service_id'
        },
        serviceName: {
            type: Sequelize.INTEGER,
            field: 'service_name'
        },
        instanceId: {
          type: Sequelize.STRING,
          field: 'instance_id'
        },
        status: Sequelize.STRING,
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
        modelName: 'ServiceInstance',
        tableName: 'service_instances'
    });

    return ServiceInstance;
};