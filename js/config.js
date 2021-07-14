/* Copyright 2020-2021 Pascal Reinhard

This file is published under the terms of the GNU Affero General Public License
as published by the Free Software Foundation, either version 3 of the License,
or (at your option) any later version. See <https://www.gnu.org/licenses/>. */

'use strict'

const Store = require('electron-store')

const schema = {
    symbol: {
        type: 'string',
        default: 'BTCUSDT'
    },
    window: {
        type: 'object',
        properties: {
            height: {
                type: 'number',
                minimum: 200,
                default: 1050
            },
            width: {
                type: 'number',
                minimum: 400,
                default: 1920
            }
        },
        default: {} // See https://github.com/sindresorhus/electron-store/issues/102
    },
    chart: {
        type: 'object',
        properties: {
            interval: {
                type: 'string',
                default: '1h'
            },
        },
        default: {}
    },
    order: {
        type: 'object',
        properties: {
            reduceOnly: {
                type: 'boolean',
                default: false
            },
            postOnly: {
                type: 'boolean',
                default: true
            },
            qtyInterval: {
                type: 'object',
                default: {}
            },
        },
        default: {}
    }
}

exports.config = new Store({schema})