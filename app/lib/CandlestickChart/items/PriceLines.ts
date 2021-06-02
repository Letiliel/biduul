import * as d3 from 'd3';
import { TodoAny } from '../../../types';
import convertType from '../../convertType';
import { ChartItem, D3Selection, ResizeData } from '../types';

type Orient = 'top' | 'bottom' | 'left' | 'right';

export interface PriceLinesDatum {
  xValue?: Date;
  yValue?: number;
  title?: string;
  color?: string;
}

interface ChartAxis {
  x: d3.Axis<d3.NumberValue>;
  yLeft: d3.Axis<d3.NumberValue>;
  yRight: d3.Axis<d3.NumberValue>;
}

interface Params {
  items: PriceLinesDatum[];
  axis: ChartAxis;
  showX?: boolean;
  color?: string;
  isVisible?: boolean;
  isTitleVisible?: boolean;
  isDraggable?: boolean;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  onUpdate?: (y: number[]) => void;
}

export default class PriceLines implements ChartItem {
  #wrapper?: D3Selection<SVGGElement>;

  #parent?: D3Selection<SVGElement>;

  #items: PriceLinesDatum[];

  #draggableItem: PriceLinesDatum | null = null;

  readonly #showX: boolean;

  readonly #color;

  readonly #axis: ChartAxis;

  #lineStyle: 'solid' | 'dashed' | 'dotted';

  #yPrecision = 1;

  #isVisible = true;

  readonly #isTitleVisible: boolean;

  readonly #isDraggable: boolean;

  #resizeData: ResizeData;

  #onUpdate?: (y: number[]) => void;

  constructor(
    {
      items, axis, showX, color, isVisible, lineStyle, isTitleVisible, isDraggable, onUpdate,
    }: Params,
    resizeData: ResizeData,
  ) {
    this.#items = items;
    this.#axis = axis;
    this.#resizeData = resizeData;
    this.#showX = !!showX;
    this.#color = color ?? '#ff00ff';
    this.#isVisible = isVisible ?? true;
    this.#lineStyle = lineStyle ?? 'solid';
    this.#isTitleVisible = isTitleVisible ?? false;
    this.#isDraggable = isDraggable ?? false;
    this.#onUpdate = onUpdate;
  }

  public appendTo = (
    parent: Element,
    resizeData: ResizeData,
    { wrapperCSSStyle }: { wrapperCSSStyle?: Partial<CSSStyleDeclaration> } = {},
  ): void => {
    this.#parent = convertType<D3Selection<SVGElement>>(d3.select(parent));

    this.#wrapper = this.#parent.append('g');

    Object.assign(this.#wrapper.node()?.style ?? {}, wrapperCSSStyle ?? {});

    this.update({ items: this.#items, isVisible: this.#isVisible });

    this.resize(resizeData);
  };

  public resize = (resizeData: ResizeData): void => {
    this.#resizeData = resizeData;

    this.#wrapper?.selectAll('.price-line-right-group')
      .attr('transform', `translate(${resizeData.width}, 0)`);

    this.#wrapper?.selectAll('.price-line-bottom-group')
      .attr('transform', `translate(0, ${this.#resizeData.height})`);

    // --- line ---
    this.#wrapper?.selectAll('.price-line-horizontal-group .price-line-line').attr('x2', resizeData.width);
    this.#wrapper?.selectAll('.price-line-vertical-group .price-line-line').attr('y2', resizeData.height);

    this.#wrapper?.selectAll('.price-line-title-group').attr('transform', `translate(${this.#resizeData.width - 200}, 0)`);

    this.#draw();
  };

  public update = (data: {
    items?: PriceLinesDatum[], isVisible?: boolean, yPrecision?: number
  }): void => {
    if (!this.#wrapper) return;

    if (typeof data.isVisible !== 'undefined') {
      this.#isVisible = data.isVisible;

      this.#wrapper.style('visibility', data.isVisible ? '' : 'hidden');
    }

    if (typeof data.yPrecision !== 'undefined') {
      this.#yPrecision = data.yPrecision;
    }

    if (typeof data.items !== 'undefined') {
      this.#items = data.items;
      this.#onUpdate?.(this.#items.map(({ yValue }) => yValue ?? -1));
    }

    this.#draw();
  };

  public updateItem = (i: number | PriceLinesDatum, data: PriceLinesDatum): void => {
    const index = typeof i === 'number' ? i : this.#items.indexOf(i);
    if (index < 0) throw new Error('Unable to find item');
    this.#items[index] = this.#items[index] ?? {};
    Object.assign(this.#items[index], data);
    this.update({ items: this.#items });
  };

  public addItem = (data: PriceLinesDatum): void => {
    this.#items.push(data);
    this.update({ items: this.#items });
  };

  public removeItem = (i: number | PriceLinesDatum): void => {
    const index = typeof i === 'number' ? i : this.#items.indexOf(i);
    if (index < 0) throw new Error('Unable to find item');
    this.#items.splice(index, 1);
    this.update({ items: this.#items });
  };

  public invertX = (px: number): Date => convertType<{ invert:(px: number) => Date }>(
    this.#axis.x.scale()).invert(px);

  public invertY = (px: number): number => convertType<{ invert:(px: number) => number }>(
    this.#axis.yLeft.scale()).invert(px);

  public getItems = (): PriceLinesDatum[] => this.#items;

  #draw = (): void => {
    if (!this.#wrapper) return;
    const updateHorizontalLineHandler = (
      update: d3.Selection<d3.BaseType, PriceLinesDatum, SVGGElement, unknown>,
      orient: Orient,
      axis: d3.Axis<d3.NumberValue>,
    ): d3.Selection<d3.BaseType, PriceLinesDatum, SVGGElement, unknown> => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const textSelection = update.select(`.price-line-${orient}-label`) as d3.Selection<SVGTextElement, PriceLinesDatum, SVGGElement, unknown>;
      update
        .select('.price-line-horizontal-group')
        .attr('transform', (d) => `translate(0, ${String(axis.scale()(d.yValue ?? 0))})`)
        .attr('fill', ({ color }) => color ?? this.#color);

      this.#setPriceTextAttributes({
        textSelection,
        axis,
        orient,
      });

      return update;
    };

    const updateVerticalLineHandler = (
      update: d3.Selection<d3.BaseType, PriceLinesDatum, SVGGElement, unknown>,
      axis: d3.Axis<d3.NumberValue>,
    ): d3.Selection<d3.BaseType, PriceLinesDatum, SVGGElement, unknown> => {
      if (!this.#showX) return update;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const textSelection = update.select('.price-line-bottom-label') as d3.Selection<SVGTextElement, PriceLinesDatum, SVGGElement, unknown>;
      update
        .select('.price-line-vertical-group')
        .attr('transform', (d) => `translate(${String(axis.scale()(d.xValue ?? 0))}, 0)`)
        .attr('fill', ({ color }) => color ?? this.#color);

      this.#setPriceTextAttributes({
        textSelection,
        axis,
        orient: 'bottom',
      });

      return update;
    };

    this.#wrapper
      .selectAll('.price-line-wrapper')
      .data(this.#items)
      .join(
        (enter) => {
          // --- horizontal line ---
          const wrapper = enter.append('g').attr('class', 'price-line-wrapper');

          if (this.#isDraggable) {
            wrapper.style('cursor', 'ns-resize');
          }

          const horizontalWrapper = wrapper.append('g').attr('class', 'price-line-horizontal-group');

          // --- line ---
          const horizontalLine = horizontalWrapper.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', this.#resizeData.width)
            .attr('y2', 0)
            .attr('stroke', ({ color }) => color ?? this.#color)
            .attr('class', 'price-line-line');

          if (this.#lineStyle !== 'solid') {
            horizontalLine.attr('stroke-dasharray', this.#lineStyle === 'dashed' ? '10 7' : '2 4');
          }

          // --- line note ---
          if (this.#isDraggable) {
            // increases area of line when it's dragged
            horizontalWrapper.append('rect')
              .attr('class', 'price-line-handle')
              .attr('x', 0)
              .attr('y', -5)
              .attr('width', this.#resizeData.width)
              .attr('height', 10)
              .attr('fill', 'transparent');

            horizontalWrapper.call(
              d3.drag<Element, PriceLinesDatum>()
                .on('start', this.#onDragStart)
                .on('drag', this.#onDrag)
                .on('end', this.#onDragEnd) as TodoAny,
            );
          }

          if (this.#isTitleVisible) {
            const titleGroup = horizontalWrapper.append('g')
              .attr('class', 'price-line-title-group')
              .attr('transform', `translate(${this.#resizeData.width - 200}, 0)`);

            titleGroup.append('rect')
              .attr('fill', '#010025')
              .attr('x', 0)
              .attr('y', -12)
              .attr('width', 150)
              .attr('height', 24)
              .attr('rx', 4)
              .attr('stroke', ({ color }) => color ?? this.#color)
              .attr('stroke-width', 1);

            titleGroup.append('text')
              .text(({ title }) => title ?? '')
              .attr('x', 10)
              .attr('y', 3)
              .style('pointer-events', 'none');
          }

          // --- left label ---
          const leftLabelGroup = horizontalWrapper.append('g').attr('class', 'price-line-left-group');
          leftLabelGroup.append('path')
            .attr('d', this.#getPriceTextBackgroundPath({
              axis: this.#axis.yLeft,
              orient: 'left',
            }))
            .attr('class', 'price-line-left-background');
          leftLabelGroup.append('text')
            .attr('class', 'price-line-left-label');

          // --- right label ---
          const rightLabelGroup = horizontalWrapper.append('g')
            .attr('class', 'price-line-right-group')
            .attr('transform', `translate(${this.#resizeData.width}, 0)`);

          rightLabelGroup.append('path')
            .attr('d', this.#getPriceTextBackgroundPath({
              axis: this.#axis.yRight,
              orient: 'right',
            }))
            .attr('class', 'price-line-right-background');
          rightLabelGroup.append('text')
            .attr('class', 'price-line-right-label')
            .attr('fill', '#fff');

          // vertical line
          if (this.#showX) {
            const verticalWrapper = wrapper.append('g').attr('class', 'price-line-vertical-group');

            // --- line ---
            const verticalLine = verticalWrapper.append('line')
              .attr('x1', 1)
              .attr('y1', 0)
              .attr('x2', 1)
              .attr('y2', this.#resizeData.height)
              .attr('stroke', ({ color }) => color ?? this.#color)
              .attr('class', 'price-line-line');

            if (this.#lineStyle !== 'solid') {
              verticalLine.attr('stroke-dasharray', this.#lineStyle === 'dashed' ? '10 7' : '2 4');
            }

            // --- left label ---
            const bottomLabelGroup = verticalWrapper.append('g')
              .attr('class', 'price-line-bottom-group')
              .attr('transform', `translate(0, ${this.#resizeData.height})`);
            bottomLabelGroup.append('path')
              .attr('d', this.#getPriceTextBackgroundPath({
                axis: this.#axis.x,
                orient: 'bottom',
              }))
              .attr('class', 'price-line-bottom-background');
            bottomLabelGroup.append('text')
              .attr('class', 'price-line-bottom-label');
          }

          // --- initial update ---
          const updateWrapper = convertType<
          d3.Selection<d3.BaseType, PriceLinesDatum, SVGGElement, unknown>
          >(wrapper);
          updateHorizontalLineHandler(updateWrapper, 'left', this.#axis.yLeft);
          updateHorizontalLineHandler(updateWrapper, 'right', this.#axis.yRight);
          updateVerticalLineHandler(updateWrapper, this.#axis.x);

          return wrapper;
        },
        (update) => {
          updateHorizontalLineHandler(update, 'left', this.#axis.yLeft);
          updateHorizontalLineHandler(update, 'right', this.#axis.yRight);
          updateVerticalLineHandler(update, this.#axis.x);
          return update;
        },
        (exit) => exit.remove(),
      );
  };

  #getPriceTextBackgroundPath = ({
    axis, orient,
  }: { axis: d3.Axis<d3.NumberValue>, orient: Orient }): string => {
    const height = 14;
    const point = 4;
    const neg = orient === 'left' || orient === 'top' ? -1 : 1;

    const value = 1;
    let pt = point;

    switch (orient) {
      case 'left':
      case 'right': {
        const width = 50;
        let h = 0;

        if (height / 2 < point) pt = height / 2;
        else h = height / 2 - point;

        return `M 0 ${value} l ${neg * Math.max(axis.tickSizeInner(), 1)} ${-pt
        } l 0 ${-h} l ${neg * width} 0 l 0 ${height
        } l ${neg * -width} 0 l 0 ${-h}`;
      }
      case 'top':
      case 'bottom': {
        const width = 100;
        let w = 0;

        if (width / 2 < point) pt = width / 2;
        else w = width / 2 - point;

        return `M ${value} 0 l ${-pt} ${neg * Math.max(axis.tickSizeInner(), 1)
        } l ${-w} 0 l 0 ${neg * height} l ${width} 0 l 0 ${neg * -height
        } l ${-w} 0`;
      }
      default:
    }

    return '';
  };

  #setPriceTextAttributes = ({
    axis, orient, textSelection,
  }: {
    axis: d3.Axis<d3.NumberValue>;
    orient: Orient;
    textSelection: d3.Selection<SVGTextElement, PriceLinesDatum, SVGGElement, unknown>;
  }): void => {
    const neg = orient === 'left' || orient === 'top' ? -1 : 1;

    switch (orient) {
      case 'left':
      case 'right':
        textSelection.attr('x', neg * (Math.max(axis.tickSizeInner(), 0) + axis.tickPadding()))
          .attr('y', 0)
          .attr('dy', '.32em')
          .style('text-anchor', neg < 0 ? 'end' : 'start')
          .text(({ yValue }) => d3.format(`,.${this.#yPrecision}f`)(yValue ?? 0));
        break;
      case 'top':
      case 'bottom':
        textSelection.attr('x', 0)
          .attr('y', neg * (Math.max(axis.tickSizeInner(), 0) + axis.tickPadding()))
          .attr('dy', neg < 0 ? '0em' : '.72em')
          .style('text-anchor', 'middle')
          .text(({ xValue }) => (xValue ? d3.timeFormat('%-d/%-m/%Y %-H:%M:%S')(xValue) : ''));
        break;
      default:
    }
  };

  #onDragStart = (_evt: unknown, datum: PriceLinesDatum): void => {
    this.#draggableItem = datum;
  };

  #onDrag = (evt: { sourceEvent: MouseEvent }): void => {
    if (!this.#draggableItem) return;

    this.updateItem(this.#draggableItem, {
      yValue: this.invertY(evt.sourceEvent.offsetY),
    });
  };

  #onDragEnd = (): void => {
    this.#draggableItem = null;
  };
}