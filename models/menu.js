const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuItems = sequelize.define('MenuItem', {
    day: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mealType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    alternateWeek: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    seasonal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
},{
    tableName: 'MenuItems' // Explicitly set the table name
});

const Feedback = sequelize.define('Feedback', {
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    day: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mealType: {
        type: DataTypes.STRING,
        allowNull: false
    },
});

module.exports = { MenuItems, Feedback };