'use strict'
const api = require('../api-futures')

events.on('api.newTrade', updateTrades)

var data = []
var table = d3.select('#trades').append('div')
        .attr('class', 'table')

var timer = 0
function updateTrades (d) {
    data.unshift(d)
    if (data.length > 10) data.pop()

    if (Date.now() < timer + 16) return // throttle redraw to 60 fps
    timer = Date.now()

    table.selectAll('.table > div')
        .data(data)
        .join(
            enter => enter.append('div')
                .attr('class', d => 'row ' + ((d.m) ? 'sell' : 'buy'))
                .call(row => {
                    row.selectAll('div')
                        .data(d => [d.p, d.q])
                        .enter().append('div')
                            .html(d => d)
            }),
            update => update
                .call(row => {
                    row.attr('class', d => 'row ' + ((d.m) ? 'sell' : 'buy'))
                    row.selectAll('div')
                        .data(d => [d.p, d.q])
                            .html(d => d)
            })
    )
}
