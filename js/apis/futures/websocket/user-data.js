/* Copyright 2020-2021 Pascal Reinhard

This file is published under the terms of the GNU Affero General Public License
as published by the Free Software Foundation, either version 3 of the License,
or (at your option) any later version. See <https://www.gnu.org/licenses/>. */

'use strict'
const cache = require('../cache')


module.exports = class UserData {

    constructor (lib, rest) {
        this.lib = lib
        this.rest = rest
    }

    stream () {
        // Get key
        this.lib.futuresGetDataStream()
            .then(response => this._openStream(response))
            .catch(err => console.error(err))
    }

    _openStream (key) {
        let stream = new WebSocket('wss://fstream.binance.com/ws/' + key.listenKey)

        // Get what happened before the stream opened
        stream.onopen = () => {
            this.rest.getOpenOrders()
            this.rest.getPosition()
        }

        stream.onmessage = (e) => {
            let data = JSON.parse(e.data)

            if (data.e == 'ORDER_TRADE_UPDATE')
                this._orderUpdate(data)
            if (data.e == 'ACCOUNT_UPDATE') {
                this._positionUpdate(data)
                this._balancesUpdate(data)
            }
        }

        // Ping every 10 min to keep stream alive
        setInterval(() => {
                this.lib.futuresGetDataStream()
                    .catch(e => console.error(e))
            }, 20 * 60000
        )

        // Reopen if closed
        stream.onclose = () => this.stream()
    }

    _balancesUpdate (data) {
        if (cache.account.balance != data.a.B[0].wb) {
            cache.account.balance = data.a.B[0].wb
            events.emit('api.balancesUpdate', cache.account)
            // Get full data from Rest Api
            this.rest.getAccount()
        }
    }

    _positionUpdate (data) {
        let updatedPositions = data.a.P

        updatedPositions.forEach(p => {
            let i = cache.positions.findIndex(x => x.symbol === p.s)
            if (i === -1)
                i = cache.positions.push({}) - 1

            Object.assign(cache.positions[i], {
                margin: p.iw,
                marginType: p.mt,
                price: p.ep,
                value: p.ep, // Alias, for feeding to techan.substance
                qty: p.pa,
                baseValue: p.pa * p.ep,
                side: (p.pa >= 0) ? 'buy' : 'sell',
                symbol: p.s
            })
        })
        this.rest.getPosition() // REST update for missing data

        events.emit('api.positionUpdate', cache.positions)
    }

    _orderUpdate(data) {
        let o = data.o
        let order = {
            id: o.i,
            clientID: o.c,
            filledQty: o.z,
            price: o.p,
            value: o.p, // Alias, for feeding to techan.supstance
            qty: o.q,
            baseValue: o.q * o.p,
            reduceOnly: o.R,
            side: o.S.toLowerCase(),
            status: o.X,
            stopPrice: o.sp,
            symbol: o.s,
            time: o.T,
            timeInForce: o.f,
            type: o.o,
            updateTime: data.E
        }

        if(order.status === 'PARTIALLY_FILLED') {
            cache.openOrders.forEach((o) => {
                if(o.id === order.id) {
                    Object.assign(o, order);
                }
            });
        }

        // New limit order
        if (order.status == 'NEW' && order.type == 'LIMIT') {
            cache.openOrders.push(order)
        }
        // Removed limit order
        if (order.type == 'LIMIT'
            && ['CANCELED', 'EXPIRED', 'FILLED'].indexOf(order.status) >= 0)
            {
            let index = cache.openOrders.findIndex(x => x.id == order.id)
            if (typeof index != 'undefined') {
                cache.openOrders.splice(index, 1)

                if(order.status == 'FILLED')
                    new Audio('./assets/audio/plop.mp3').play()
            }
        }
        // Market order
        if (order.type === 'MARKET' && order.status === 'FILLED')
            new Audio('./assets/audio/plop.mp3').play()

        events.emit('api.orderUpdate', cache.openOrders)
    }
}
