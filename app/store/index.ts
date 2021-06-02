import convertType from '../lib/convertType';

import Persistent from './Persistent';
import Market from './Market';
import Account from './Account';
import Stats from './Stats';
import Trading from './Trading';

export class RootStore {
  public readonly persistent: Persistent;

  public readonly market: Market;

  public readonly account: Account;

  public readonly stats: Stats;

  public readonly trading: Trading;

  public isSettingsModalOpen;

  constructor() {
    this.persistent = new Persistent();
    this.market = new Market(this);
    this.account = new Account(this);
    this.trading = new Trading(this);
    this.stats = new Stats(this);
    this.isSettingsModalOpen = !this.persistent.binanceApiKey;
  }
}

const store = new RootStore();

if (process.env.NODE_ENV === 'development') {
  // make store to be accessed ass a global variable
  convertType<{ store: RootStore }>(window).store = store;
}

export default store;