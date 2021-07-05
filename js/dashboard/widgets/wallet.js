/* Copyright 2020-2021 Pascal Reinhard

This file is published under the terms of the GNU Affero General Public License
as published by the Free Software Foundation, either version 3 of the License,
or (at your option) any later version. See <https://www.gnu.org/licenses/>. */

'use strict'
const api = require('../../apis/futures')
const stats = require('../../data/stats')
const TransferModal = require('../modals/transfer-funds')
const { truncateDecimals } = require('../../snippets')

events.on('api.balancesUpdate', updateWallet)
events.on('api.priceUpdate', updateWallet)
setInterval(api.getPosition, 1000)
setInterval(api.getAccount, 2000)

let accountData

async function updateWallet (data) {
    if (data.assets === undefined)
        data = accountData
    else
        accountData = data

    if(!data) return

    let format = (value, str = ',.2f') => nFormat(str, truncateDecimals(value, 2))

    let pnl = stats.getPnl()
    let pnlPercent = nFormat(',.1%', pnl.percent)

    let balance = parseFloat(data.totalWalletBalance)
    let unrealizedBalance = pnl.value + balance

    let dailyPnl = await stats.getDailyPnl()
    let dailyPnlPercent = nFormat(',.1%', dailyPnl.percent)

    let dailyBreakEven = await stats.getDailyBreakEven()

    let positionMargin = data.totalPositionInitialMargin
    let posMarginPercent = nFormat(',.1%', positionMargin / balance)

    let orderMargin = data.totalOpenOrderInitialMargin
    let orderMarginPercent = nFormat(',.1%', orderMargin / balance)

    data = [
        'Balance: ', format(balance),
        'Equity: ', format(api.account.totalMarginBalance),
        'Available', format(api.account.availableBalance),
        'Unrealized PNL: ', format(pnl.value) + ' (' + pnlPercent + ')',
        'Daily PNL: ', format(dailyPnl.value) + ' (' + dailyPnlPercent + ')',
        'Daily break-even: ', format(dailyBreakEven, ',.4f'),
        'Position margin: ', format(positionMargin) + ' (' + posMarginPercent + ')',
        'Order margin: ', format(orderMargin) + ' (' + orderMarginPercent + ')',
    ]

    d3.select('#balances').selectAll('#balances > div')
        .data(data)
        .join(
            enter => enter.append('div').text(d => d)
                .class((d, i) => (i%2) ? 'value' : 'label'),
            update => update.text(d => d)
        )
}

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   Funds transfer
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
d3.select('#transfer-funds > span')
    .on('click', () => new TransferModal().display())
