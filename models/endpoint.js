'use strict';

const {Sequelize, Model} = require('sequelize');

module.exports = (sequelize) => {
    class Endpoint extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }
    
    Endpoint.init({
        serviceId: {
            type: Sequelize.INTEGER,
            field: 'service_id'
        },
        url: Sequelize.STRING,
        method: Sequelize.STRING,
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
        modelName: 'Endpoint',
        tableName: 'endpoints'
    });

    return Endpoint;
};