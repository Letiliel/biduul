'use strict'
const Modal = require('./modal')
const api = require('../../apis/futures')


module.exports = class TransferModal extends Modal {

    constructor () {
        super()
        this.title('Transfer between wallets')
        this.direction = 1 // 1 = Spot to Futures | 2 = The opposite
        this._createBody()
    }

    _createBody () {
        this.body.html(`
        <table>
            <tr>
                <td>From</td>
                <td></td>
                <td>To</td>
            </tr>
            <tr class="direction">
                <td><div class="source">  Spot  </div></td>
                <td><div class="switch"><div>⇌</div></div></td>
                <td><div class="target">Futures</div></td>
            </tr>
        </table>
        <div class="input">
            <label for="transfer-qty">Qty</label>
            <input id="transfer-qty" />
            <select name="currency" class="currency">
                <option value="USDT">USDT</option>
                <option value="BNB">BNB</option>
            </select>
        </div>
        <div class="max">Available: <span class="link"></span></div>
        <button class="btn">Confirm transfer</button></div>
        `)

        this.source = this.body.select('.source')
        this.target = this.body.select('.target')
        this.switch = this.body.select('.switch')
        this.qty = this.body.select('#transfer-qty')
        this.currency = this.body.select('.currency')
        this.max = this.body.select('.max span')
        this.confirm = this.body.select('button')

        this._getMax()

        this.switch.on('click', () => this._onSwitchDirection())
        this.currency.on('change', () => this._onCurrencyChange())
        this.max.on('click', () => this._copyMax())
        this.confirm.on('click', () => this._confirm())
    }

    _getCurrency () {
        return this.currency.node().value
    }

    _getMax () {
        this.max.html('Retrieving amount...')

        if (this.direction === 1) {
            api.lib.balance((err, balances) => {
                if (err)
                    return console.error(error)

                if (this.direction === 2)
                    return

                let max = balances[this._getCurrency()].available
                this.maxQty = Number(d3.format('~f')(max))
                this.max.html(d3.format(',~f')(this.maxQty))
            })
        }
        else {
            let data = api.account.assets.filter(x => x.asset == this._getCurrency())

            let max = data[0].maxWithdrawAmount
            this.maxQty = Number(d3.format('~f')(max))
            this.max.html(d3.format(',~f')(this.maxQty))
        }
    }

    _copyMax () {
        this.qty.attr('value', this.maxQty || 0)
    }

    _confirm () {
        // Todo: migrate to node.binance.api when futures transfer available
        let url = 'https://api.binance.com/sapi/v1/futures/transfer'
        let data = {
            asset: this._getCurrency(),
            amount: this.qty.node().value,
            type: this.direction
        }
        api.lib.signedRequest(url, data, null, 'POST')
        this.destroy()
    }

    _onSwitchDirection () {
        if (this.direction === 1) {
            this.direction = 2
            this.source.html('Futures')
            this.target.html('Spot')
        }
        else {
            this.direction = 1
            this.source.html('Spot')
            this.target.html('Futures')
        }
        this._getMax()
    }

    _onCurrencyChange () {
        this._getMax()
    }
}