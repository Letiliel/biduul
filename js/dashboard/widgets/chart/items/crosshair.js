/* Copyright 2020-2021 Pascal Reinhard

This file is published under the terms of the GNU Affero General Public License
as published by the Free Software Foundation, either version 3 of the License,
or (at your option) any later version. See <https://www.gnu.org/licenses/>. */

'use strict'
const techan = require('techan')
const AxisLabel = require('./axis-label')

module.exports = class Crosshair {

    wrapper

    constructor (chart) {
        this.chart = chart
        this.axisLabel = new AxisLabel(chart)
        this._getDimensions()

        this.techan = techan.plot.crosshair()
                .xScale(this.scales.x)
                .yScale(this.scales.y)
                .xAnnotation(this.axisLabel.bottom(this.axes.x, this.height))
                .yAnnotation([
                    this.axisLabel.left(this.axes.yLeft),
                    this.axisLabel.right(this.axes.yRight, this.width)
                ])
    }

    appendTo (container) {
        this.wrapper = container.append('g')
            .class('crosshair')
    }

    draw () {
        this.wrapper.call(this.techan)
    }

    resize () {
        this._getDimensions()
        this.techan
            .xAnnotation(this.axisLabel.bottom(this.axes.x, this.height))
            .yAnnotation([
                this.axisLabel.left(this.axes.yLeft),
                this.axisLabel.right(this.axes.yRight, this.width)
            ])
    }

    _getDimensions () {
        this.scales = this.chart.scales
        this.axes = this.chart.axes
        this.width = this.chart.width
        this.height = this.chart.height
    }
}
