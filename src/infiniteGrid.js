/**
* Copyright (c) 2015 NAVER Corp.
* egjs projects are licensed under the MIT license
*/

// jscs:disable validateLineBreaks, maximumLineLength
eg.module("infiniteGrid", ["jQuery", eg, window, document, "Outlayer"], function($, ns, global, doc, Outlayer) {
	"use strict";

	// jscs:enable validateLineBreaks, maximumLineLength
	if (!Outlayer) {
		ns.InfiniteGrid = ns.Class({});
		return;
	}

	function clone(target, source, what) {
		var s;
		$.each(what, function(i, v) {
			s = source[v];
			if (v in source) {
				if ($.isArray(s)) {
					target[v] = $.merge([], s);
				} else if ($.isPlainObject(s)) {
					target[v] = $.extend(true, {}, s);
				} else {
					target[v] = s;
				}
			}
		});
		return target;
	}

	var InfiniteGridCore = Outlayer.create("InfiniteGrid");
	$.extend(InfiniteGridCore.prototype, {
		// @override (from layout)
		_resetLayout: function() {
			if (!this._isLayoutInited) {
				this._registGroupKey(this.options.defaultGroupKey, this.items);
			}
			this.element.style.width = null;
			this.getSize();	// create size property
			this._measureColumns();
		},

		// @override
		_getContainerSize: function() {
			return {
				height: Math.max.apply(Math, this._appendCols),
				width: this.size.innerWidth
			};
		},

		// @override
		_getItemLayoutPosition: function(item) {
			if (this._equalItemSize) {
				item.size = this._equalItemSize;
			} else {
				item.getSize();
			}
			(item.isAppend == null) && (item.isAppend = true);
			var outerHeight = parseInt(item.size.outerHeight, 10);
			var shortColIndex;
			var isAppend = item.isAppend;
			var cols = isAppend ? this._appendCols : this._prependCols;
			var y = Math[isAppend ? "min" : "max"].apply(Math, cols);
			if (isAppend) {
				shortColIndex = $.inArray(y, cols);
			} else {
				var i = cols.length;
				while (i-- >= 0) {
					if (cols[i] === y) {
						shortColIndex = i;
						break;
					}
				}
			}
			cols[shortColIndex] = y + (isAppend ? outerHeight : -outerHeight);

			return {
				x: this.columnWidth * shortColIndex,
				y: isAppend ? y : y - outerHeight
			};
		},
		resetLayout: function() {
			this._resetLayout();
			this._isLayoutInited = true;
		},
		updateCols: function(isAppend) {
			var col = isAppend ? this._appendCols : this._prependCols;
			var items = this.getColItems(isAppend);
			var base = this._isFitted || isAppend ? 0 : this._getMinY(items);
			var i = 0;
			var len = col.length;
			var item;
			for (; i < len; i++) {
				if (item = items[i]) {
					col[i] = item.position.y + (isAppend ? item.size.outerHeight : -base);
				} else {
					col[i] = 0;
				}
			}
			return base;
		},
		_getMinY: function(items) {
			return Math.min.apply(Math, $.map(items, function(v) {
				return v ? v.position.y : 0;
			}));
		},
		_measureColumns: function() {
			var containerWidth = this.size.innerWidth;
			var columnWidth = this._getColumnWidth();
			var cols = containerWidth / columnWidth;
			var excess = columnWidth - containerWidth % columnWidth;

			// if overshoot is less than a pixel, round up, otherwise floor it
			cols = Math.max(Math[ excess && excess <= 1 ? "round" : "floor" ](cols), 1);

			// reset column Y
			this._appendCols = [];
			this._prependCols = [];
			while (cols--) {
				this._appendCols.push(0);
				this._prependCols.push(0);
			}
		},
		_getColumnWidth: function() {
			var el = this.items[0] && this.items[0].element;
			var size;
			if (el) {
				/* jshint ignore:start */
				size = getSize(el);
				/* jshint ignore:end */
			} else {
				size = {
					outerWidth: 0,
					outerHeight: 0
				};
			}
			this.options.isEqualSize && (this._equalItemSize = size);
			this.columnWidth = size.outerWidth || this.size.outerWidth;
			return this.columnWidth;
		},
		_getColIdx: function(item) {
			return parseInt(item.position.x / parseInt(this.columnWidth, 10), 10);
		},
		getColItems: function(isTail) {
			var len = this._appendCols.length;
			var colItems = new Array(len);
			var item;
			var idx;
			var count = 0;
			var i = isTail ? this.items.length - 1 : 0;
			while (item = this.items[i]) {
				idx = this._getColIdx(item);
				if (!colItems[idx]) {
					colItems[idx] = item;
					if (++count === len) {
						return colItems;
					}
				}
				i += isTail ? -1 : 1;
			}
			return colItems;
		},
		clone: function(target, source) {
			clone(target, source, [
				"_isLayoutInited",
				"_equalItemSize",
				"_appendCols",
				"_prependCols",
				"columnWidth",
				"size",
				"options"
				]);
			target.items = target.items || [];
			target.items.length = source.items.length;
			$.each(source.items, function(i) {
				target.items[i] = clone(target.items[i] || {}, source.items[i],
					["position", "size", "isAppend", "groupKey"]);
			});
			return target;
		},
		itemize: function(elements, groupKey) {
			var items = this._itemize(elements);
			this._registGroupKey(groupKey, items);
			return items;
		},
		_registGroupKey: function(groupKey, array) {
			if (groupKey != null) {
				var i = 0;
				var v;
				while (v = array[i++]) {
					v.groupKey = groupKey;
				}
			}
		},

		// @override
		destroy: function() {
			this.off();
			Outlayer.prototype.destroy.apply(this);
		}
	});

	/**
	 * To build Grid layout UI
	 * InfiniteGrid is composed using Outlayer and supports recycle-dom.
	 * DOM elements are fixed even contents are added infinitely.
	 * @group egjs
	 * @ko InfiniteGrid는 무한 그리드 레이아웃 UI 컴포넌트이다. 이 컴포넌트는 크게 2가지 기능을 제공한다.
	 첫째, 다양한 크기의 카드를 격자모양으로 배치하는 기능을 제공한다. 동일한 넓이를 가진 카드는 위에서부터 차례대로 수직 공간의 빈 공간에 끼워 맞춰진다.
	 둘째, 카드의 개수가 계속 증가하더라도, 내부적으로 일정한 DOM의 개수를 유지한다. 이로 인해, 카드가 무한으로 증가하더라도, 최적의 성능을 보장한다.
	 * @class
	 * @name eg.InfiniteGrid
	 * @extends eg.Component
	 *
	 * @param {HTMLElement|String|jQuery} element wrapper element <ko>기준 요소</ko>
	 * @param {Object} [options]
	 * @param {String} [options.itemSelector] selector string for layout item elements <ko>레이아웃 구성시, 구성의 단위로 사용될 엘리먼트들의 셀렉터. 즉, 카드들의 셀렉터.</ko>
	 * @param {Number} [options.count=30] when count value is greater than 0, grid will maintain same DOM length recycling <ko>내부적으로 유지되는 실제 DOM의 개수. count값이 0보다 클 경우, 일정한 dom 개수를 유지한다. count값이 0보다 작을 경우, DOM의 개수는 카드가 추가되면 될수록 계속 증가한다.</ko>
	 * @param {String} [options.defaultGroupKey=null] when encounter item markup during the initialization, then set `defaultGroupKey` as groupKey <ko>객체를 초기화할 때 마크업에 존재하는 카드에 부여될 그룹키</ko>
	 * @param {Boolean} [options.isEqualSize=false] determine if all item's size are same <ko>배치 될 카드의 크기가 모두 동일한 경우, 이 옵션을 true로 설정하면, 레이아웃 배치 성능을 높일 수 있다.</ko>
	 * @param {Number} [options.threshold=300] Threshold pixels to determine if grid needs to append or prepend elements<ko>뷰포트의 임계치 픽셀 값. InfinteGrid는 window 스크롤의 y값이 '마지막 카드 엘리먼트(getBottomElement)의 top + threshold' 값에 도달하면, append 이벤트가 발생하고, '최상위 카드 엘리먼트(getTopElement)의 bottom - threshold' 값에 도달하면, prepend 이벤트가 발생한다.</ko>
	 *
	 * @codepen {"id":"zvrbap", "ko":"InfiniteGrid 데모", "en":"InfiniteGrid example", "collectionId":"DPYEww", "height": 403}
	 *  @support {"ie": "8+", "ch" : "latest", "ff" : "latest",  "sf" : "latest", "edge" : "latest", "ios" : "7+", "an" : "2.1+ (except 3.x)"}
	 *
	 *  @see Outlayer {@link https://github.com/metafizzy/outlayer}
	 *
	 * @example
		<!-- HTML -->
		<ul id="grid">
			<li class="card">
			  <div>test1</div>
			</li>
			<li class="card">
			  <div>test2</div>
			</li>
			<li class="card">
			  <div>test3</div>
			</li>
			<li class="card">
			  <div>test4</div>
			</li>
			<li class="card">
			  <div>test5</div>
			</li>
			<li class="card">
			  <div>test6</div>
			</li>
		</ul>
		<script>
		var some = new eg.InfiniteGrid("#grid", {
			itemSelector : ".card"
		}).on("layoutComplete", function(e) {
			// ...
		});
		</script>
	 */
	var EVENTS = {
		"layoutComplete": "layoutComplete",
		"append": "append",
		"prepend": "prepend"
	};
	ns.InfiniteGrid = ns.Class.extend(ns.Component, {
		_events: function() {
			return EVENTS;
		},
		construct: function(el, options, _prefix) {
			this.options = $.extend({
				"isEqualSize": false,
				"defaultGroupKey": null,
				"count": 30,
				"threshold": 300
			}, options);
			this.options.transitionDuration = 0;	// don't use this option.
			this.options.isInitLayout = false;	// isInitLayout is always 'false' in order to controll layout.
			this.options.isResizeBound = false;	// isResizeBound is always 'false' in order to controll layout.

			// if el is jQuery instance, el should change to HTMLElement.
			if (el instanceof $) {
				el = el.get(0);
			}
			this._prefix = _prefix || "";
			this.core = new InfiniteGridCore(el, this.options)
				.on(EVENTS.layoutComplete, $.proxy(this._onlayoutComplete, this));
			this.$view = $(global);
			this._reset();
			this.core.$element.children().length > 0 && this.layout();
			this._onResize = $.proxy(this._onResize, this);
			this._onScroll = $.proxy(this._onScroll, this);
			this._isIos = ns.agent().os.name === "ios";
			this._prevScrollTop = 0;
			this._topElement = null;
			this._bottomElement = null;
			this._refreshViewport();
			this.$view.on("resize", this._onResize);
			this.$view.on("scroll", this._onScroll);
		},
		_getScrollTop: function() {
			return doc.body.scrollTop || doc.documentElement.scrollTop;
		},
		_onScroll: function() {
			if (this.core && !this.core._isLayoutInited) {
				return;
			}
			if (this.isProcessing()) {
				return;
			}
			var scrollTop = this._getScrollTop();
			var prevScrollTop = this._prevScrollTop;

			if (this._isIos && scrollTop === 0 || prevScrollTop === scrollTop) {
				return;
			}
			var ele;
			var rect;
			if (prevScrollTop < scrollTop) {
				if ($.isEmptyObject(this._bottomElement)) {
					this._bottomElement = this.getBottomElement();
				}
				ele = this._bottomElement;
				rect = ele.getBoundingClientRect();
				if (rect.top <= this._clientHeight + this.options.threshold) {
					/**
					 * Occurs when grid needs to append elements.
					 * in order words, when scroll reaches end of page
					 *
					 * @ko 카드가 append 될 필요가 있을 때 발생하는 이벤트. 사용자가 아래로 스크롤 할 때, 화면상에서 더이상 추가로 볼 카드가 없는 경우에 발생한다.
					 * @name eg.InfiniteGrid#append
					 * @event
					 *
					 * @param {Object} param
					 * @param {Number} param.scrollTop scrollTop scroll-y position of window<ko>윈도우 y 스크롤의 값</ko>
					 */
					this.trigger(this._prefix + EVENTS.append, {
						scrollTop: scrollTop
					});
				}
			} else {
				if (this.isRecycling() && this._removedContent > 0) {
					if ($.isEmptyObject(this._topElement)) {
						this._topElement = this.getTopElement();
					}
					ele = this._topElement;
					rect = ele.getBoundingClientRect();
					if (rect.bottom >= -this.options.threshold) {
						/**
						 * Occurs when grid needs to prepend elements
						 * in order words, when scroll reaches top of page and a count of cropped element is more than zero.
						 *
						 * @ko 카드가 prepend 될 필요가 있을 때 발생하는 이벤트. 실제 추가된 카드는 더 있지만, 일정한 수의 DOM 개수를 유지하기 위해 내부적으로 삭제된다. 이때, 사용자가 위로 스크롤 할 경우, 화면상에서 더이상 추가로 볼 카드가 없는 경우에 prepend 이벤트가 발생된다. 이 이벤트는 isRecycling()의 반환값이 true일 경우에만 발생한다.
						 * @name eg.InfiniteGrid#prepend
						 * @event
						 *
						 * @param {Object} param
						 * @param {Number} param.scrollTop scrollTop scroll-y position of window<ko>윈도우 y 스크롤의 값</ko>
						 */
						var croppedDistance = this.fit();
						if (croppedDistance > 0) {
							scrollTop -= croppedDistance;
							this.$view.scrollTop(scrollTop);
						}
						this.trigger(this._prefix + EVENTS.prepend, {
							scrollTop: scrollTop
						});
					}
				}
			}
			this._prevScrollTop = scrollTop;
		},
		_onResize: function() {
			if (this.resizeTimeout) {
				clearTimeout(this.resizeTimeout);
			}
			if (this.core && !this.core._isLayoutInited) {
				return;
			}
			var self = this;
			function delayed() {
				self._refreshViewport();
				if (self.core) {
					self.core.element.style.width = null;
					self.core.needsResizeLayout() && self.layout();
				}
				delete self.resizeTimeout;
			}
			this.resizeTimeout = setTimeout(delayed, 100);
		},
		_refreshViewport: function() {
			this._clientHeight = this.$view.height();
		},
		/**
		 * Get current status
		 * @ko 각각 카드의 위치 정보 등 현재 상태 정보를 반환한다. 반환된 정보는 저장해두었다가 setStatus() 함수를 통해 복원할 수 있다.
		 * @method eg.InfiniteGrid#getStatue
		 * @return {Object} infiniteGrid status Object<ko>infiniteGrid 상태 오브젝트</ko>
		 */
		getStatus: function() {
			var data = [];
			var p;
			for (p in this) {
				if (this.hasOwnProperty(p) && /^_/.test(p) &&
					typeof this[p] !== "function" && !(this[p] instanceof HTMLElement)) {
					data.push(p);
				}
			}
			return {
				core: this.core.clone({}, this.core),
				data: clone({}, this, data),
				html: this.core.$element.html(),
				cssText: this.core.element.style.cssText
			};
		},
		/**
		 * Set current status
		 * @ko infiniteGrid의 현재 상태를 설정한다. getStatus() 를 통해 반환된 상태 정보로 복원한다.
		 * @method eg.InfiniteGrid#setStatus
		 * @param {Object} status Object
		 * @return {eg.InfiniteGrid} instance of itself<ko>자신의 인스턴스</ko>
		 */
		setStatus: function(status) {
			if (!status || !status.cssText || !status.html ||
				!status.core || !status.data) {
				return this;
			}
			this.core.element.style.cssText = status.cssText;
			this.core.$element.html(status.html);
			this.core.items = this.core.itemize(this.core.$element.children().toArray());
			this.core.clone(this.core, status.core);
			$.extend(this, status.data);
			return this;
		},
		/**
		 * Check if element is appending or prepending
		 * @ko append나 prepend가 진행 중인 상태를 반환한다. 진행 중일 경우 true를 반환한다.
		 * @method eg.InfiniteGrid#isProcessing
		 * @return {Boolean}
		 */
		isProcessing: function() {
			return this._isProcessing;
		},
		/**
		 * Check if elements are in recycling mode
		 * @ko 추가된 총 카드의 개수가 count 옵션 개수( > 0)보다 클 경우 true 를 반환한다. 이후에는 카드가 추가되더라도 더 이상 DOM 개수가 증가하지 않고 기존 DOM 을 재활용(recycle)한다.
		 * 즉, 일정한 DOM을 유지하는 상태가 되면 true를 반환한다.
		 * @method eg.InfiniteGrid#isRecycling
		 * @return {Boolean}
		 */
		isRecycling: function() {
			return this.core.options.count > 0 && this._isRecycling;
		},
		/**
		 * Get group keys
		 * @ko 현재 유지되고 있는 카드들의 그룹키 목록을 반환한다. 여러 개의 카드를 하나의 그룹으로 묶어 관리하기 위해 옵션으로 그룹키를 지정할 수 있다. 그룹키를 이용해 여러 개의 카드들을 관리할 수 있다. append 나 prepend 때, 그룹키를 지정하지 않았다면, 반환되는 그룹키는 undefined 이다.
		 * @method eg.InfiniteGrid#getGroupKeys
		 * @return {Array} groupKeys
		 */
		getGroupKeys: function() {
			var result = [];
			if (this.core._isLayoutInited) {
				var i = 0;
				var item;
				while (item = this.core.items[i++]) {
					result.push(item.groupKey);
				}
			}
			return result;
		},
		/**
		 * Rearrange layout
		 * @ko 레이아웃을 재배치한다.
		 * @method eg.InfiniteGrid#layout
		 * @return {eg.InfiniteGrid} instance of itself<ko>자신의 인스턴스</ko>
		 */
		layout: function() {
			this._isProcessing = true;
			this._isAppendType = true;
			var i = 0;
			var v;
			while (v = this.core.items[i++]) {
				v.isAppend = true;
			}
			!this.core._isLayoutInited ?
				this._waitResource(this.core.$element, function() {
					this.core.layout();
				}) : this.core.layout();
			return this;
		},
		/**
		 * Append elements
		 * @ko 카드 엘리먼트를 append 한다.
		 * 이 메소드는 isProcessing()의 반환값이 false일 경우에만 사용 가능하다.
		 * @method eg.InfiniteGrid#append
		 * @param {Array|String|jQuery} elements to be appended elements <ko>append될 카드 엘리먼트의 배열</ko>
		 * @param {Number|String} [groupKey] to be appended groupkey of elements<ko>append될 카드 엘리먼트의 그룹키 (생략하면 undefined)</ko>
		 * @return {Number} length a number of elements
		 */
		append: function($elements, groupKey) {
			if (this._isProcessing || $elements.length === 0) {
				return;
			}

			// convert jQuery instance
			$elements = $($elements);
			this._isProcessing = true;
			if (!this._isRecycling) {
				this._isRecycling =
				(this.core.items.length + $elements.length) >= this.core.options.count;
			}
			this._insert($elements, groupKey, true);
			return $elements.length;
		},
		/**
		 * Prepend elements
		 * @ko 카드 엘리먼트를 prepend 한다.
		 * 이 메소드는 isProcessing()의 반환값이 false이고, isRecycling()의 반환값이 true일 경우에만 사용 가능하다.
		 * @method eg.InfiniteGrid#prepend
		 * @param {Array|String|jQuery} elements to be prepended elements <ko>prepend될 카드 엘리먼트 배열</ko>
		 * @param {Number|String} [groupKey] to be prepended groupkey of elements<ko>prepend될 카드 엘리먼트의 그룹키 (생략하면 undefined)</ko>
		 * @return {Number} length a number of elements
		 */
		prepend: function($elements, groupKey) {
			if (!this.isRecycling() || this._removedContent === 0 ||
				this._isProcessing || $elements.length === 0) {
				return;
			}

			// convert jQuery instance
			$elements = $($elements);

			this._isProcessing = true;
			this._fit();
			if ($elements.length > this._removedContent) {
				$elements = $elements.slice(0, this._removedContent);
			}
			this._insert($elements, groupKey, false);
			return $elements.length;
		},
		/**
		 * Clear elements and data
		 * @ko 추가된 카드 엘리먼트와 데이터를 모두 지운다.
		 * @method eg.InfiniteGrid#clear
		 * @return {eg.InfiniteGrid} instance of itself<ko>자신의 인스턴스</ko>
		 */
		clear: function() {
			this.core.$element.empty();
			this.core.items.length = 0;
			this._reset();
			this.layout();
			return this;
		},

		_getTopItem: function() {
			var item = null;
			var min = Infinity;
			$.each(this.core.getColItems(false), function(i, v) {
				if (v && v.position.y < min) {
					min = v.position.y;
					item = v;
				}
			});
			return item;
		},

		/**
		 * Get the first element at the top
		 * @ko 가장 상위에 있는 카드 엘리먼트를 반환한다.
		 * @method eg.InfiniteGrid#getTopElement
		 *
		 * @return {HTMLElement} element
		 */
		getTopElement: function() {
			var item = this._getTopItem();
			return item && item.element;
		},

		_getBottomItem: function() {
			var item = null;
			var max = -Infinity;
			$.each(this.core.getColItems(true), function(i, v) {
				if (v && v.position.y + v.size.outerHeight > max) {
					max = v.position.y + v.size.outerHeight;
					item = v;
				}
			});
			return item;
		},

		/**
		 * Get the last element at the bottom
		 * @ko 가장 하위에 있는 카드 엘리먼트를 반환한다.
		 * @method eg.InfiniteGrid#getBottomElement
		 *
		 * @return {HTMLElement} element
		 */
		getBottomElement: function() {
			var item = this._getBottomItem();
			return item && item.element;
		},

		_onlayoutComplete: function(e) {
			var distance = 0;
			var isAppend = this._isAppendType;

			// refresh element
			this._topElement = this.getTopElement();
			this._bottomElement = this.getBottomElement();

			if (isAppend === false) {
				this._isFitted = false;
				this._fit(true);
				distance = e.length >= this.core.items.length ?
					0 : this.core.items[e.length].position.y;
				if (distance > 0) {
					this._prevScrollTop = this._getScrollTop() + distance;
					this.$view.scrollTop(this._prevScrollTop);
				}
			}

			// reset flags
			this._reset(true);

			/**
			 * Occurs when layout is completed (after append / after prepend / after layout)
			 * @ko 레이아웃 배치가 완료 되었을 때 발생하는 이벤트 (append/prepend/layout 메소드 호출 후, 카드의 배치가 완료되었을때 발생)
			 * @name eg.InfiniteGrid#layoutComplete
			 * @event
			 *
			 * @param {Object} param
			 * @param {Array} param.target target rearranged elements<ko>재배치된 카드 엘리먼트들</ko>
			 * @param {Boolean} param.isAppend isAppend determine if append or prepend (value is true when call layout method)<ko>카드 엘리먼트가 append로 추가되었는지, prepend로 추가되었는지를 반환한다. (layout호출시에는 true 값을 반환한다)</ko>
			 * @param {Number} param.distance the distance of moved top-element after layoutComplete event is triggered. in order words, prepended distance or height <ko>최상단 엘리먼트가 layoutComplete 이벤트 발생 후,이동되어진 거리. 즉, prepend 되어 늘어난 거리(높이)</ko>
			 * @param {Number} param.croppedCount the count of removed elements for recycle-dom. <ko>일정한 DOM 개수를 유지하기 위해, 삭제된 카드 엘리먼트들의 개수</ko>
			 */
			this.trigger(this._prefix + EVENTS.layoutComplete, {
				target: e.concat(),
				isAppend: isAppend,
				distance: distance,
				croppedCount: this._removedContent
			});
		},

		// $elements => $([HTMLElement, HTMLElement, ...])
		_insert: function($elements, groupKey, isAppend) {
			if ($elements.length === 0) {
				return;
			}
			this._isAppendType = isAppend;
			var elements = $elements.toArray();
			var $cloneElements = $(elements);
			var i = 0;
			var item;
			var items = this.core.itemize(elements, groupKey);
			while (item = items[i++]) {
				item.isAppend = isAppend;
			}
			if (isAppend) {
				this.core.items = this.core.items.concat(items);
			} else {
				this.core.items = items.concat(this.core.items.slice(0));
				items = items.reverse();
			}
			this.isRecycling() && this._adjustRange(isAppend, $cloneElements);

			var noChild = this.core.$element.children().length === 0;
			this.core.$element[isAppend ? "append" : "prepend"]($cloneElements);
			noChild && this.core.resetLayout();		// for init-items

			this._waitResource($cloneElements, function() {
				this.core.layoutItems(items, true);
			});
		},
		_waitResource: function($element, callback) {
			var needCheck = this._checkImageLoaded($element);
			if (needCheck.length > 0) {
				this._waitImageLoaded(needCheck, callback);
			} else {
				var self = this;

				// convert to async
				setTimeout(function() {
					callback && self.core && callback.apply(self);
				}, 0);
			}
		},
		_adjustRange: function (isTop, $elements) {
			var diff = this.core.items.length - this.core.options.count;
			var targets;
			var idx;
			if (diff <= 0 || (idx = this._getDelimiterIndex(isTop, diff)) < 0) {
				return;
			}
			if (isTop) {
				targets = this.core.items.slice(0, idx);
				this.core.items = this.core.items.slice(idx);
				this._isFitted = false;
			} else {
				targets = this.core.items.slice(idx);
				this.core.items = this.core.items.slice(0, idx);
			}

			// @todo improve performance
			var i = 0;
			var item;
			var el;
			while (item = targets[i++]) {
				el = item.element;
				idx = $elements.index(el);
				if (idx !== -1) {
					$elements.splice(idx, 1);
				} else {
					el.parentNode.removeChild(el);
				}
			}
			this._removedContent += isTop ? targets.length : -targets.length;

		},
		_getDelimiterIndex: function(isTop, removeCount) {
			var len = this.core.items.length;
			var i;
			var idx = 0;
			var baseIdx = isTop ? removeCount - 1 : len - removeCount;
			var targetIdx = baseIdx + (isTop ? 1 : -1);
			var groupKey = this.core.items[baseIdx].groupKey;
			if (groupKey != null && groupKey === this.core.items[targetIdx].groupKey) {
				if (isTop) {
					for (i = baseIdx; i > 0; i--) {
						if (groupKey !== this.core.items[i].groupKey) {
							break;
						}
					}
					idx =  i === 0 ? -1 : i + 1;
				} else {
					for (i = baseIdx; i < len; i++) {
						if (groupKey !== this.core.items[i].groupKey) {
							break;
						}
					}
					idx = i === len ? -1 : i;
				}
			} else {
				idx = isTop ? targetIdx : baseIdx;
			}
			return idx;
		},

		// fit size
		_fit: function(applyDom) {
			// for caching
			if (this.core.options.count <= 0) {
				this._fit = function() {
					return false;
				};
				this._isFitted = true;
				return false;
			}

			if (this._isFitted) {
				return false;
			}

			var item;
			var height;
			var i = 0;
			var y = this.core.updateCols();	// for prepend
			while (item = this.core.items[i++]) {
				item.position.y -= y;
				applyDom && $.style(item.element, "top", item.position.y + "px");
			}
			this.core.updateCols(true);	// for append
			height = this.core._getContainerSize().height;
			applyDom && this.core._setContainerMeasure(height, false);
			this._isFitted = true;
			return true;
		},

		/**
		 * Remove white space which was removed by append action.
		 * @ko append에 의해 생긴 빈공간을 제거한다.
		 * @method eg.InfiniteGrid#fit
		 * @return {Number} distance if empty space is removed, value is not zero. <ko>빈공간이 제거된 실제 길이를 px 단위로 반환</ko>
		 */
		fit: function() {
			var item = this._getTopItem();
			var distance = item ? item.position.y : 0;
			this._fit(true);
			return distance;
		},
		_reset: function(isLayoutComplete) {
			if (!isLayoutComplete) {
				this._isFitted = true;
				this._isRecycling = false;
				this._removedContent = 0;
			}
			this._isAppendType = null;
			this._isProcessing = false;
		},
		_checkImageLoaded: function($elements) {
			var needCheck = [];
			$elements.each(function(k, v) {
				if (v.nodeName === "IMG") {
					!v.complete && needCheck.push(v);
				} else if (v.nodeType &&
					(v.nodeType === 1 || v.nodeType === 9 || v.nodeType === 11)) {	// ELEMENT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE
					needCheck = needCheck.concat($(v).find("img").filter(function(fk, fv) {
						return !fv.complete;
					}).toArray());
				}
			});
			return needCheck;
		},
		_waitImageLoaded: function(needCheck, callback) {
			var self = this;
			var checkCount = needCheck.length;
			var onCheck = function(e) {
				checkCount--;
				$(e.target).off("load error");
				checkCount <= 0 && callback && self.core && callback.apply(self);
			};
			$.each(needCheck, function(k, v) {
				$(v).on("load error", onCheck);
			});
		},
		/**
		 * Release resources and unbind custom events
		 * @ko 모든 커스텀 이벤트와 자원을 해제한다.
		 * @method eg.InfiniteGrid#destroy
		 */
		destroy: function() {
			if (this.core) {
				this.core.destroy();
				this.core = null;
			}
			this.$view.off("resize", this._onResize)
				.off("scroll", this._onScroll);
			this.off();
		}
	});

	return {
		"clone": clone
	};
});
/**
 * InfiniteGrid in jQuery plugin
 * @ko InfiniteGrid in jQuery plugin
 * @method jQuery.infiniteGrid
 * @example
     <ul id="grid">
        <li class="item">
          <div>test1</div>
        </li>
        <li class="item">
          <div>test3</div>
        </li>
      </ul>
    <script>
	// create
	$("#grid").infiniteGrid({
        itemSelector : ".item"
    });
 	// method
 	$("#grid").infiniteGrid("option","itemSelector",".selected"); //Set option
 	$("#grid").infiniteGrid("instance"); // Return infiniteGrid instance
 	$("#grid").infiniteGrid("getBottomElement"); // Get bottom element
 	</script>
 * @see eg.InfiniteGrid
 */
 /**
 * infiniteGrid:layoutComplete jQuery event plugin
 *
 * @ko infiniteGrid:layoutComplete jQuery event plugin
 * @name jQuery#infiniteGrid:layoutComplete
 * @event
 * @example
     <ul id="grid">
        <li class="item">
          <div>test1</div>
        </li>
        <li class="item">
          <div>test3</div>
        </li>
      </ul>
    <script>
	// create
	$("#grid").infiniteGrid({
        itemSelector : ".item"
    });
 	// event
 	$("#grid").on("infiniteGrid:layoutComplete",callback);
 	$("#grid").off("infiniteGrid:layoutComplete",callback);
 	$("#grid").trigger("infiniteGrid:layoutComplete",callback);
 	</script>
 * @see eg.InfiniteGrid#event:layoutComplete
 */
/**
 * infiniteGrid:append jQuery event plugin
 *
 * @ko infiniteGrid:append jQuery event plugin
 * @name jQuery#infiniteGrid:append
 * @event
 * @example
     <ul id="grid">
        <li class="item">
          <div>test1</div>
        </li>
        <li class="item">
          <div>test3</div>
        </li>
      </ul>
    <script>
	// create
	$("#grid").infiniteGrid({
        itemSelector : ".item"
    });
 	// event
 	$("#grid").on("infiniteGrid:append",callback);
 	$("#grid").off("infiniteGrid:append",callback);
 	$("#grid").trigger("infiniteGrid:append",callback);
 	</script>
 * @see eg.InfiniteGrid#event:append
 */
/**
 * infiniteGrid:prepend jQuery event plugin
 *
 * @ko infiniteGrid:prepend jQuery event plugin
 * @name jQuery#infiniteGrid:prepend
 * @event
 * @example
     <ul id="grid">
        <li class="item">
          <div>test1</div>
        </li>
        <li class="item">
          <div>test3</div>
        </li>
      </ul>
    <script>
	// create
	$("#grid").infiniteGrid({
        itemSelector : ".item"
    });
 	// event
 	$("#grid").on("infiniteGrid:prepend",callback);
 	$("#grid").off("infiniteGrid:prepend",callback);
 	$("#grid").trigger("infiniteGrid:prepend",callback);
 	</script>
 * @see eg.InfiniteGrid#event:prepend
 */