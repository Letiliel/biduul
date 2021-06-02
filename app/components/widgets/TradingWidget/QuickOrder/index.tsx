import { format } from 'd3';
import { capitalize } from 'lodash';
import { OrderSide } from 'node-binance-api';
import React, { ReactElement } from 'react';
import { Button, Row, Col } from 'reactstrap';

import css from './style.css';

const col = 3;

interface Props {
  totalEquity: number;
  availableEquity: number;
  side: OrderSide;
}

const formatMoney = (value: number) => format(value > 1000 ? ',.0f' : ',.2f')(value);

const ButtonCol = ({
  totalEquity, availableEquity, side, percent,
}: Props & { percent: number }) => {
  const value = totalEquity * (percent / 100);
  return (
    <Col xs={col}>
      <Button className="w-100 nowrap" disabled={value > availableEquity} color={side === 'BUY' ? 'success' : 'sell'}>
        {percent}
        %
        <br />
        <span className={css.value}>
          ₮
          {formatMoney(value)}
        </span>
      </Button>
    </Col>
  );
};

const QuickOrder = ({ totalEquity, availableEquity, side }: Props): ReactElement => (
  <>
    <div className="mb-1">
      Quick
      {' '}
      {capitalize(side)}
    </div>
    <Row className={`${css.wrapper} mb-3`}>
      <ButtonCol
        totalEquity={totalEquity}
        availableEquity={availableEquity}
        side={side}
        percent={10}
      />
      <ButtonCol
        totalEquity={totalEquity}
        availableEquity={availableEquity}
        side={side}
        percent={25}
      />
      <ButtonCol
        totalEquity={totalEquity}
        availableEquity={availableEquity}
        side={side}
        percent={50}
      />
      <Col xs={col}>
        <Button className="w-100 nowrap" color={side === 'BUY' ? 'success' : 'sell'}>
          Max
          <br />
          <span className={css.value}>
            ₮
            {formatMoney(availableEquity)}
          </span>
        </Button>
      </Col>
    </Row>
  </>
);

export default QuickOrder;
