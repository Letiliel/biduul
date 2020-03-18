'use strict'
const api = require('../api-futures')
const stats = require('../stats')

api.onBalancesUpdate.push(updateWallet)
api.onPriceUpdate.push(updateWallet)
setInterval(api.getAccount, 2000)

var accountData

async function updateWallet (data) {
    if (data.assets === undefined) data = accountData
    else accountData = data

    var format = (value, symbol) => d3.format(',.2~f')(value) // + ' ₮'

    var balance = parseFloat(data.totalWalletBalance)
    var pnl = stats.getPNL().pnl
    var pnlPercent = d3.format(',.1~%')(stats.getPNL().percent)
    var dailyPNL = await stats.getDailyPNL().pnl
    var dailyPNLPercent = d3.format(',.1~%')(await stats.getDailyPNL().percent)
    var unrealizedBalance = pnl + balance

    data = [
        'Balance: ', format(data.totalWalletBalance),
        'Balance + PNL: ', format(unrealizedBalance),
        'PNL: ', format(pnl) + ' (' + pnlPercent + ')',
        'Position margin: ', format(data.totalPositionInitialMargin),
        'Order margin: ', format(data.totalOpenOrderInitialMargin),
        'Daily pnl', format(dailyPNL) + ' (' + dailyPNLPercent + ')'
    ]

    d3.select('#balances').selectAll('#balances > div')
        .data(data)
        .join(
            enter => enter.append('div').text(d => d)
                .attr('class', (d, i) => (i%2) ? 'value' : 'label'),
            update => update.text(d => d)
        )
}
