import { Layout } from 'react-grid-layout';
import { listenChange } from 'use-change';
import * as api from '../api';

function getPersistentStorageValue<T, K extends string>(key: K, defaultValue: T): T {
  const storageValue = localStorage.getItem(key);
  return storageValue ? JSON.parse(storageValue) as T : defaultValue;
}

export default class Persistent {
  public symbol = getPersistentStorageValue<string, keyof Persistent>('symbol', 'BTCUSDT');

  // public leverage = getPersistentStorageValue<number, keyof Persistent>('leverage', 1);

  public interval = getPersistentStorageValue<api.CandlestickChartInterval, keyof Persistent>('interval', '1d');

  public theme = getPersistentStorageValue<'dark' | 'light', keyof Persistent>('theme', 'light');

  public layout = getPersistentStorageValue<Layout[], keyof Persistent>('layout', []);

  public binanceApiKey = getPersistentStorageValue<string | null, keyof Persistent>('binanceApiKey', null);

  public binanceApiSecret = getPersistentStorageValue<string | null, keyof Persistent>('binanceApiSecret', null);

  public ignoreValuesBelowNumber = getPersistentStorageValue<number, keyof Persistent>('ignoreValuesBelowNumber', 10);

  public alerts = getPersistentStorageValue<number[], keyof Persistent>('alerts', []);

  constructor() {
    Object.getOwnPropertyNames(this).forEach((key) => {
      listenChange(this, key as keyof Persistent, (value: unknown) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
    });
  }
}
