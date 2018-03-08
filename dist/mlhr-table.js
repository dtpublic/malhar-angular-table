'use strict';
// Source: dist/controllers/MlhrTableController.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.controllers.MlhrTableController', [
  'datatorrent.mlhrTable.services.mlhrTableSortFunctions',
  'datatorrent.mlhrTable.services.mlhrTableFilterFunctions',
  'datatorrent.mlhrTable.services.mlhrTableFormatFunctions'
]).controller('MlhrTableController', [
  '$scope',
  '$element',
  'mlhrTableFormatFunctions',
  'mlhrTableSortFunctions',
  'mlhrTableFilterFunctions',
  '$log',
  '$window',
  '$filter',
  '$timeout',
  function ($scope, $element, formats, sorts, filters, $log, $window, $filter, $timeout) {
    // SCOPE FUNCTIONS
    $scope.getSelectableRows = function () {
      var tableRowFilter = $filter('mlhrTableRowFilter');
      return angular.isArray($scope.rows) ? tableRowFilter($scope.rows, $scope.columns, $scope.searchTerms, $scope.filterState, $scope.options) : [];
    };
    $scope.isSelectedAll = function () {
      if (!angular.isArray($scope.rows) || !angular.isArray($scope.selected)) {
        return false;
      }
      var rows = $scope.getSelectableRows();
      return rows.length > 0 && rows.length === $scope.selected.length;
    };
    $scope.selectAll = function () {
      $scope.deselectAll();
      // Get a list of filtered rows
      var rows = $scope.getSelectableRows();
      if (rows.length <= 0)
        return;
      var columns = $scope.columns;
      var selectorKey = null;
      var selectObject = null;
      // Search for selector key in selector column
      for (var i = 0; i < columns.length; i++) {
        if (columns[i].selector) {
          selectorKey = columns[i].key;
          selectObject = columns[i].selectObject;
          $scope.options.__selectionColumn = columns[i];
          break;
        }
      }
      // Verify that selectorKey was found
      if (!selectorKey) {
        throw new Error('Unable to find selector column key for selectAll');
      }
      //select key or entire object from all rows
      for (var i = 0; i < rows.length; i++) {
        $scope.selected.push(selectObject ? rows[i] : rows[i][selectorKey]);
      }
    };
    $scope.deselectAll = function () {
      while ($scope.selected.length > 0) {
        $scope.selected.pop();
      }
    };
    $scope.toggleSelectAll = function ($event) {
      var checkbox = $event.target;
      if (checkbox.checked) {
        $scope.selectAll();
      } else {
        $scope.deselectAll();
      }
    };
    $scope.addSort = function (id, dir) {
      var idx = $scope.sortOrder.indexOf(id);
      if (idx === -1) {
        $scope.sortOrder.push(id);
      }
      $scope.sortDirection[id] = dir;
    };
    $scope.removeSort = function (id) {
      var idx = $scope.sortOrder.indexOf(id);
      if (idx !== -1) {
        $scope.sortOrder.splice(idx, 1);
      }
      delete $scope.sortDirection[id];
    };
    $scope.clearSort = function () {
      $scope.sortOrder = [];
      $scope.sortDirection = {};
    };
    // Checks if columns have any filter fileds
    $scope.hasFilterFields = function () {
      for (var i = $scope.columns.length - 1; i >= 0; i--) {
        if (typeof $scope.columns[i].filter !== 'undefined') {
          return true;
        }
      }
      return false;
    };
    // Clears search field for column, focus on input
    $scope.clearAndFocusSearch = function (columnId) {
      $scope.searchTerms[columnId] = '';
      $element.find('tr.mlhr-table-filter-row th.column-' + columnId + ' input').focus();
    };
    // Toggles column sorting
    $scope.toggleSort = function ($event, column) {
      var direction;
      // check if even sortable
      if (!column.sort) {
        return;
      }
      if ($event.shiftKey) {
        // shift is down, ignore other columns
        // but toggle between three states
        switch ($scope.sortDirection[column.id]) {
        case '+':
          // Make descending
          $scope.sortDirection[column.id] = '-';
          direction = '-';
          break;
        case '-':
          // Remove from sortOrder and direction
          $scope.removeSort(column.id);
          $scope.$emit('__column.sorted__', { id: column.id });
          break;
        default:
          // Make ascending
          $scope.addSort(column.id, '+');
          direction = '+';
          break;
        }
      } else {
        // shift is not down, disable other
        // columns but toggle two states
        var lastState = $scope.sortDirection[column.id];
        var replace = true;
        $scope.clearSort();
        if (lastState === '+') {
          $scope.addSort(column.id, '-');
          direction = '-';
        } else {
          $scope.addSort(column.id, '+');
          direction = '+';
        }
      }
      $scope.$emit('__column.sorted__', {
        id: column.id,
        direction: direction,
        replace: replace
      });
      $scope.saveToStorage();
    };
    // Retrieve className for given sorting state
    $scope.getSortClass = function (sorting) {
      var classes = $scope.options.sortClasses;
      if (sorting === '+') {
        return classes[1];
      }
      if (sorting === '-') {
        return classes[2];
      }
      return classes[0];
    };
    $scope.setColumns = function (columns) {
      $scope.columns = columns;
      $scope.columns.forEach(function (column) {
        // formats
        var format = column.format;
        if (typeof format !== 'function') {
          if (typeof format === 'string') {
            if (typeof formats[format] === 'function') {
              column.format = formats[format];
            } else {
              try {
                column.format = $filter(format);
              } catch (e) {
                delete column.format;
                $log.warn('format function reference in column(id=' + column.id + ') ' + 'was not found in built-in format functions or $filters. ' + 'format function given: "' + format + '". ' + 'Available built-ins: ' + Object.keys(formats).join(',') + '. ' + 'If you supplied a $filter, ensure it is available on this module');
              }
            }
          } else {
            delete column.format;
          }
        }
        // sort
        var sort = column.sort;
        if (typeof sort !== 'function') {
          if (typeof sort === 'string') {
            if (typeof sorts[sort] === 'function') {
              column.sort = sorts[sort](column.key);
            } else {
              delete column.sort;
              $log.warn('sort function reference in column(id=' + column.id + ') ' + 'was not found in built-in sort functions. ' + 'sort function given: "' + sort + '". ' + 'Available built-ins: ' + Object.keys(sorts).join(',') + '. ');
            }
          } else {
            delete column.sort;
          }
        }
        // filter
        var filter = column.filter;
        if (typeof filter !== 'function') {
          if (typeof filter === 'string') {
            if (typeof filters[filter] === 'function') {
              column.filter = filters[filter];
            } else {
              delete column.filter;
              $log.warn('filter function reference in column(id=' + column.id + ') ' + 'was not found in built-in filter functions. ' + 'filter function given: "' + filter + '". ' + 'Available built-ins: ' + Object.keys(filters).join(',') + '. ');
            }
          } else {
            delete column.filter;
          }
        }
      });
    };
    $scope.startColumnResize = function ($event, column) {
      // Stop default so text does not get selected
      $event.preventDefault();
      $event.originalEvent.preventDefault();
      $event.stopPropagation();
      // init variable for new width
      var new_width = false;
      // store initial mouse position
      var initial_x = $event.pageX;
      // create marquee element
      var $m = $('<div class="column-resizer-marquee"></div>');
      // append to th
      var $th = $($event.target).parent('th');
      $th.append($m);
      // set initial marquee dimensions
      var initial_width = $th.outerWidth();
      function mousemove(e) {
        // calculate changed width
        var current_x = e.pageX;
        var diff = current_x - initial_x;
        new_width = initial_width + diff;
        // update marquee dimensions
        $m.css('width', new_width + 'px');
      }
      $m.css({
        width: initial_width + 'px',
        height: $th.outerHeight() + 'px'
      });
      // set mousemove listener
      $($window).on('mousemove', mousemove);
      // set mouseup/mouseout listeners
      $($window).one('mouseup', function (e) {
        e.stopPropagation();
        // remove marquee, remove window mousemove listener
        $m.remove();
        $($window).off('mousemove', mousemove);
        // set new width on th
        // if a new width was set
        if (new_width === false) {
          delete column.width;
        } else {
          column.width = Math.max(new_width, 0);
        }
        $scope.$emit('__column.resized__', {
          id: column.id,
          width: column.width
        });
        $scope.saveToStorage();
        $scope.$apply();
      });
    };
    $scope.sortableOptions = {
      axis: 'x',
      handle: '.column-text',
      helper: 'clone',
      placeholder: 'mlhr-table-column-placeholder',
      distance: 5,
      stop: function (event, ui) {
        $scope.$emit('__column.moved__', $scope.columns.map(function (col) {
          return col.id;
        }));
      }
    };
    $scope.getActiveColCount = function () {
      var count = 0;
      $scope.columns.forEach(function (col) {
        if (!col.disabled) {
          count++;
        }
      });
      return count;
    };
    $scope.saveToStorage = function () {
      if (!$scope.storage) {
        return;
      }
      // init object to stringify/save
      var state = {};
      // save state objects
      [
        'sortOrder',
        'sortDirection',
        'searchTerms'
      ].forEach(function (prop) {
        state[prop] = $scope[prop];
      });
      // serialize columns
      state.columns = $scope.columns.map(function (col) {
        return {
          id: col.id,
          disabled: !!col.disabled,
          width: col.width
        };
      });
      // save non-transient options
      state.options = {};
      [
        'rowLimit',
        'pagingScheme',
        'storageHash'
      ].forEach(function (prop) {
        state.options[prop] = $scope.options[prop];
      });
      // Save to storage
      $scope.storage.setItem($scope.storageKey, JSON.stringify(state));
    };
    $scope.processStateString = function (stateString) {
      // Try to parse it
      var state;
      try {
        // stateString might be the userOverrides object in the table options.
        // Only parse if it is not an object.
        if (angular.isObject(stateString)) {
          state = stateString;
        } else {
          state = JSON.parse(stateString);
        }
        // if mismatched storage hash, stop loading from storage
        if (state.options.storageHash !== $scope.options.storageHash) {
          return;
        }
        if ($scope.options.overrideSortOrder && $scope.options.overrideSortDirection) {
          $scope.sortOrder = $scope.options.overrideSortOrder;
          $scope.sortDirection = $scope.options.overrideSortDirection;
        } else {
          $scope.sortOrder = state.sortOrder;
          $scope.sortDirection = state.sortDirection;
        }
        if ($scope.options.overrideSearchTerms) {
          $scope.searchTerms = $scope.options.overrideSearchTerms;
        } else {
          $scope.searchTerms = state.searchTerms;
        }
        // validate (compare ids)
        // reorder columns and merge
        var column_ids = state.columns.map(function (col) {
            return col.id;
          });
        $scope.columns.sort(function (a, b) {
          var aNotThere = column_ids.indexOf(a.id) === -1;
          var bNotThere = column_ids.indexOf(b.id) === -1;
          if (aNotThere && bNotThere) {
            return 0;
          }
          if (aNotThere) {
            return 1;
          }
          if (bNotThere) {
            return -1;
          }
          return column_ids.indexOf(a.id) - column_ids.indexOf(b.id);
        });
        $scope.columns.forEach(function (col, i) {
          col.disabled = state.columns[i].disabled;
          if ((state.columns[i].width + '').indexOf('%')) {
            col.width = state.columns[i].width;
          } else {
            var width = parseFloat(state.columns[i].width);
            if (!isNaN(width)) {
              col.width = width;
            }
          }
        });
        // load options
        [
          'rowLimit',
          'pagingScheme',
          'storageHash'
        ].forEach(function (prop) {
          $scope.options[prop] = state.options[prop];
        });
      } catch (e) {
        $log.warn('Loading from storage failed!');
      }
    };
    $scope.loadFromStorage = function () {
      if (!$scope.storage) {
        return;
      }
      // Attempt to parse the storage
      var stateString = $scope.storage.getItem($scope.storageKey);
      // Was it there?
      if (!stateString) {
        return;
      }
      $scope.processStateString(stateString);
    };
    $scope.calculateRowLimit = function () {
      if ($scope.options.ignoreDummyRows) {
        $scope.rowLimit = $scope.rows ? $scope.rows.length : 0;
      } else {
        var rowHeight = $scope.options.fixedRowHeight || $scope.scrollDiv.find('.mlhr-table-rendered-rows tr').height();
        $scope.rowHeight = rowHeight || $scope.options.defaultRowHeight || 20;
        $scope.rowLimit = Math.ceil($scope.options.bodyHeight / $scope.rowHeight) + $scope.options.rowPadding * 2;
      }
    };
  }
]);
// Source: dist/directives/mlhrTable.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.directives.mlhrTable', [
  'datatorrent.mlhrTable.controllers.MlhrTableController',
  'datatorrent.mlhrTable.directives.mlhrTableRows',
  'datatorrent.mlhrTable.directives.mlhrTableHeaderLabel',
  'datatorrent.mlhrTable.directives.mlhrTableDummyRows'
]).directive('mlhrTable', [
  '$log',
  '$timeout',
  '$q',
  '$window',
  function ($log, $timeout, $q, $window) {
    function debounce(func, wait, immediate) {
      var timeout, args, context, timestamp, result;
      var later = function () {
        var last = Date.now() - timestamp;
        if (last < wait && last > 0) {
          timeout = $timeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            if (!timeout) {
              context = args = null;
            }
          }
        }
      };
      return function () {
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout) {
          timeout = $timeout(later, wait);
        }
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }
        return result;
      };
    }
    function defaults(obj) {
      if (typeof obj !== 'object') {
        return obj;
      }
      for (var i = 1, length = arguments.length; i < length; i++) {
        var source = arguments[i];
        for (var prop in source) {
          if (obj[prop] === void 0) {
            obj[prop] = source[prop];
          }
        }
      }
      return obj;
    }
    function link(scope, element) {
      function adjustColumnWidths(column) {
        // exit if there are no columns
        if (!scope.columns) {
          return;
        }
        // exit if there is not selection column
        var count = scope.columns.filter(function (col) {
            return col.id === 'selector';
          }).length;
        if (count === 0) {
          return;
        }
        var id = column && column.id ? column.id : undefined;
        // It is possible for users to resize all columns in the table so that the selection column gets resized wider than
        // it should be.
        // The code below will expand the last or next to last column if necessary to prevent the selection column from growing.
        // The column to be expanded cannot be the column being adjusted and the lockWidth property is not true.
        var tableWidth = element.width();
        var widths = 0;
        scope.columns.forEach(function (col) {
          if ((col.width + '').indexOf('%') > -1) {
            widths += parseFloat(col.width) / 100 * tableWidth;
          } else {
            widths += parseFloat(col.width);
          }
        });
        if (widths < tableWidth) {
          // get last column that is not the column being resized and the lockWidth is not true
          for (var i = scope.columns.length - 1; i > 0; i--) {
            if (scope.columns[i].id !== id && !scope.columns[i].lockWidth && scope.columns[i].id !== 'selector') {
              // we can delete the width of this column
              delete scope.columns[i].width;
              break;
            }
          }
        }
      }
      scope.$on('__column.resized__', function (event, column) {
        adjustColumnWidths(column);
        scope.$parent.$parent.$emit('column.resized', column);
      });
      scope.$on('__column.sorted__', function (event, column) {
        scope.$parent.$parent.$emit('column.sorted', column);
      });
      scope.$on('__column.moved__', function (event, columnPositions) {
        scope.$parent.$parent.$emit('column.moved', columnPositions);
      });
      // we also want to make sure the selection column doesn't expand when the browser resizes
      $($window).on('resize', adjustColumnWidths);
      // remove window resize event
      scope.$on('$destroy', function () {
        $($window).off('resize', adjustColumnWidths);
      });
      var REFRESH_FRAME_RATE = 500;
      // Throttle the bodyHeight update to .5 second
      // determine requestAnimationFrame compabitility
      var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function (f) {
          return setTimeout(f, scope.options.scrollDebounce);
        };
      // This tableId is used to cache the sort column function
      // It's used in the mlhrTableSortFunctions filter
      // If this value isn't set, user will see a bug when sorting
      // two different columns which have the same id property value.
      // This happens even if the columns are on different pages.
      scope.options = scope.options || {};
      scope.options.tableId = scope.$id;
      if (scope.options.setTableScope) {
        scope.options.tableScope = scope;
      }
      // Prevent following user input objects from being modified by making deep copies of originals
      scope.columns = angular.copy(scope._columns);
      // Look for built-in filter, sort, and format functions
      if (scope.columns instanceof Array) {
        scope.setColumns(scope.columns);
      } else {
        throw new Error('"columns" array not found in mlhrTable scope!');
      }
      if (scope.options !== undefined && {}.hasOwnProperty.call(scope.options, 'getter')) {
        if (typeof scope.options.getter !== 'function') {
          throw new Error('"getter" in "options" should be a function!');
        }
      }
      // Check for rows
      // if ( !(scope.rows instanceof Array) ) {
      //   throw new Error('"rows" array not found in mlhrTable scope!');
      // }
      // Object that holds search terms
      scope.searchTerms = {};
      // Array and Object for sort order+direction
      scope.sortOrder = [];
      scope.sortDirection = {};
      // Holds filtered rows count
      scope.filterState = { filterCount: scope.rows ? scope.rows.length : 0 };
      // Offset and limit
      scope.rowOffset = 0;
      scope.rowLimit = 10;
      // Default Options, extend provided ones
      scope.options = scope.options || {};
      defaults(scope.options, {
        bgSizeMultiplier: 1,
        rowPadding: 10,
        headerHeight: 77,
        bodyHeight: 300,
        fixedHeight: false,
        defaultRowHeight: 40,
        scrollDebounce: 100,
        scrollDivisor: 1,
        loadingText: 'loading',
        loadingError: false,
        noRowsText: 'no rows',
        trackBy: scope.trackBy,
        sortClasses: [
          'glyphicon glyphicon-sort',
          'glyphicon glyphicon-chevron-up',
          'glyphicon glyphicon-chevron-down'
        ],
        onRegisterApi: function (api) {
        }
      });
      // Look for initial sort order
      if (scope.options.initialSorts) {
        angular.forEach(scope.options.initialSorts, function (sort) {
          scope.addSort(sort.id, sort.dir);
        });
      }
      // Check for localStorage persistence
      if (scope.options.storage && scope.options.storageKey) {
        // Set the storage object on the scope
        scope.storage = scope.options.storage;
        scope.storageKey = scope.options.storageKey;
        // Try loading from storage
        scope.loadFromStorage();
        // Watch various things to save state
        //  Save state on the following action:
        //  - sort change
        //  occurs in $scope.toggleSort
        //  - column order change 
        scope.$watchCollection('columns', scope.saveToStorage);
        //  - search terms change
        scope.$watchCollection('searchTerms', scope.saveToStorage);
        //  - paging scheme
        scope.$watch('options.pagingScheme', scope.saveToStorage);
      } else if (scope.options.userOverrides !== undefined && scope.options.userOverrides !== null) {
        scope.processStateString(scope.options.userOverrides);
      }
      // using requestAnimationFrame to watch for bodyHeight change to get better display response
      var bodyHeightSaved = undefined;
      var lastBodyHeightUpdated = Date.now();
      var bodyHeightChanged = function () {
        var savedRowOffset = scope.rowOffset;
        scope.scrollHandler();
        if (scope.rowOffset === savedRowOffset && scope.dummyScope) {
          scope.dummyScope.updateHeight();
        }
        if (!scope.options.ignoreTableHeightStyle) {
          scope.scrollDiv.css(scope.options.fixedHeight ? 'height' : 'max-height', scope.options.bodyHeight + 'px');
        }
        scope.saveToStorage();
      };
      var rafid1;
      var bodyHeightWatchLoop = function () {
        if (scope.options.bodyHeight !== bodyHeightSaved && Date.now() - lastBodyHeightUpdated > REFRESH_FRAME_RATE) {
          lastBodyHeightUpdated = Date.now();
          bodyHeightSaved = scope.options.bodyHeight;
          bodyHeightChanged();
        }
        rafid1 = raf(bodyHeightWatchLoop);
      };
      rafid1 = raf(bodyHeightWatchLoop);
      scope.$watch('rowHeight', function (size) {
        element.find('tr.mlhr-table-dummy-row').css('background-size', 'auto ' + size * scope.options.bgSizeMultiplier + 'px');
      });
      var scrollDeferred;
      var scrollTopSaved = -1;
      var rafid2;
      var loop = function (timeStamp) {
        if (scrollTopSaved !== scope.scrollDiv.scrollTop()) {
          scope.tableHeader = scope.tableHeader || element.find('.mlhr-table.mlhr-header-table');
          scope.tableDummy = scope.tableDummy || element.find('.mlhr-table.mlhr-dummy-table.table');
          scope.tableRows = scope.tableRows || element.find('.mlhr-table.mlhr-rows-table.table');
          scrollTopSaved = scope.scrollDiv.scrollTop();
          if (!scrollDeferred) {
            scrollDeferred = $q.defer();
            scope.options.scrollingPromise = scrollDeferred.promise;
          }
          // perform scrolling code
          scope.scrollHandler();
        }
        // add loop to next repaint cycle
        rafid2 = raf(loop);
      };
      scope.scrollHandler = function () {
        scope.calculateRowLimit();
        var scrollTop = scope.scrollDiv[0].scrollTop;
        var rowHeight = scope.rowHeight;
        if (rowHeight === 0 || scope.tableRows === undefined) {
          return false;
        }
        if (scope.options.ignoreDummyRows) {
          scope.rowOffset = 0;
        } else {
          // make sure we adjust rowOffset so that last row renders at bottom of div
          scope.rowOffset = Math.max(0, Math.min(scope.filterState.filterCount - scope.rowLimit, Math.floor(scrollTop / rowHeight) - scope.options.rowPadding));
          // move the table rows to a position according to the div scroll top
          scope.tableRows.css('top', '-' + (scope.tableDummy.height() - rowHeight * scope.rowOffset) + 'px');
        }
        if (scrollDeferred) {
          scrollDeferred.resolve();
          scrollDeferred = null;
        }
        scope.options.scrollingPromise = null;
        if (!scope.$root.$$phase) {
          scope.$digest();
        }
        scope.userScrollSaved = scope.userScroll;
      };
      scope.scrollDiv = element.find('.mlhr-rows-table-wrapper');
      rafid2 = raf(loop);
      // Wait for a render
      $timeout(function () {
        // Calculates rowHeight and rowLimit
        scope.calculateRowLimit();
      }, 0);
      scope.api = {
        isSelectedAll: scope.isSelectedAll,
        selectAll: scope.selectAll,
        deselectAll: scope.deselectAll,
        toggleSelectAll: scope.toggleSelectAll,
        setLoading: function (isLoading, triggerDigest) {
          scope.options.loading = isLoading;
          if (triggerDigest) {
            scope.$digest();
          }
        }
      };
      // Register API
      scope.options.onRegisterApi(scope.api);
      //Check if loadingPromise was supplied and appears to be a promise object
      if (angular.isObject(scope.options.loadingPromise) && typeof scope.options.loadingPromise.then === 'function') {
        scope.options.loadingPromise.then(function () {
          scope.options.loadingError = false;
          scope.api.setLoading(false);
        }, function (reason) {
          scope.options.loadingError = true;
          scope.api.setLoading(false);
          $log.warn('Failed loading table data: ' + reason);
        });
      } else {
        //scope.options.loadingPromise is optional, not required. So, when it's not specified, scope.options.loading should be set to false. Otherwise, spinner wheel will hang there forever where there is no rows.
        scope.api.setLoading(false);
      }
      scope.$on('$destroy', function () {
        cancelAnimationFrame(rafid1);
        cancelAnimationFrame(rafid2);
      });
    }
    return {
      templateUrl: 'src/templates/mlhrTable.tpl.html',
      restrict: 'EA',
      replace: true,
      scope: {
        _columns: '=columns',
        rows: '=',
        classes: '@tableClass',
        selected: '=',
        options: '=?',
        trackBy: '@?'
      },
      controller: 'MlhrTableController',
      compile: function (tElement) {
        var trackBy = tElement.attr('track-by');
        if (trackBy) {
          tElement.find('.mlhr-table-rendered-rows').attr('track-by', trackBy);
        }
        return link;
      }
    };
  }
]);
// Source: dist/directives/mlhrTableCell.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.directives.mlhrTableCell', ['datatorrent.mlhrTable.directives.mlhrTableSelector']).directive('mlhrTableCell', [
  '$compile',
  '$interpolate',
  function ($compile, $interpolate) {
    function link(scope, element) {
      var column = scope.column;
      var cellMarkup = '';
      if (column.template) {
        cellMarkup = column.template;
      } else if (column.templateUrl) {
        cellMarkup = '<div ng-include="\'' + column.templateUrl + '\'"></div>';
      } else if (column.selector === true) {
        cellMarkup = '<input type="checkbox" ng-checked="selected.indexOf(column.selectObject ? row : row[column.key]) >= 0" mlhr-table-selector class="mlhr-table-selector" />';
      } else if (column.ngFilter) {
        cellMarkup = '{{ row[column.key] | ' + column.ngFilter + '}}';
      } else if (column.format) {
        if (scope.options !== undefined && {}.hasOwnProperty.call(scope.options, 'getter')) {
          cellMarkup = '{{ column.format(options.getter(column.key, row), row, column) }}';
        } else {
          cellMarkup = '{{ column.format(row[column.key], row, column) }}';
        }
      } else if (scope.options !== undefined && {}.hasOwnProperty.call(scope.options, 'getter')) {
        cellMarkup = '{{ options.getter(column.key, row) }}';
      } else {
        cellMarkup = '{{ row[column.key] }}';
      }
      element.html(cellMarkup);
      $compile(element.contents())(scope);
      scope.getPopoverTitle = function () {
        return column.popoverTitle ? scope.$eval($interpolate(column.popoverTitle)) : '';
      };
      scope.getPopoverText = function () {
        return !column.disablePopover && element[0].clientWidth < element[0].scrollWidth ? element.html() : '';
      };
      scope.getPopoverPlacement = function (columnPosition) {
        //columnPosition ranages from 0 to 1
        var placement = 'top';
        if (columnPosition < 0.33)
          placement = 'top-left';
        else if (columnPosition > 0.67)
          placement = 'top-right';
        return placement;
      };
    }
    return {
      scope: true,
      link: link
    };
  }
]);
// Source: dist/directives/mlhrTableDummyRows.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
/**
 * @ngdoc directive
 * @name datatorrent.mlhrTable.directive:mlhrTableDummyRows
 * @restrict A
 * @description inserts dummy <tr>s for non-rendered rows
 * @element tbody
 * @example <tbody mlhr-table-dummy-rows mlhr-table-dummy-rows-filtered-count="filteredState.filterCount" mlhr-table-dummy-rows-visible-count="visible_rows.length"  columns="[column array]"></tbody>
**/
angular.module('datatorrent.mlhrTable.directives.mlhrTableDummyRows', []).directive('mlhrTableDummyRows', function () {
  return {
    template: '<tr class="mlhr-table-dummy-row" ng-style="{ height: dummyRowHeight + \'px\'}"><td ng-show="dummyRowHeight" ng-attr-colspan="{{columns.length}}"></td></tr>',
    scope: true,
    link: function (scope, element, attrs) {
      scope.$parent.dummyScope = scope;
      scope.updateHeight = function () {
        if (!scope.$parent.options.ignoreDummyRows && scope.$parent.tableRows && scope.$parent.filterState && scope.$parent.visible_rows) {
          scope.dummyRowHeight = (scope.$parent.filterState.filterCount - scope.$parent.visible_rows.length) * scope.rowHeight;
          var rowHeight = scope.$parent.tableRows.height() / scope.$parent.visible_rows.length;
          scope.$parent.tableRows.css('top', '-' + (scope.dummyRowHeight - rowHeight * scope.$parent.rowOffset) + 'px');
        }
      };
      scope.$watch(attrs.mlhrTableDummyRowsFilteredCount, function (newVal, oldVal) {
        if (newVal !== oldVal) {
          scope.updateHeight();
        }
      });
      scope.$watch(attrs.mlhrTableDummyRowsVisibleCount, function (newVal, oldVal) {
        if (newVal !== oldVal) {
          scope.updateHeight();
        }
      });
    }
  };
});
// Source: dist/directives/mlhrTableHeaderLabel.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.directives.mlhrTableHeaderLabel', []).directive('mlhrTableHeaderLabel', function () {
  return {
    scope: true,
    link: function (scope, element) {
      scope.getPopoverText = function (label, description) {
        var t = '';
        if (element[0].offsetWidth < element[0].scrollWidth) {
          //label is truncated
          t = '<b>' + label + '</b>';
          if (description) {
            t += '<br>' + description;
          }
        } else {
          if (description) {
            t = description;
          }
        }
        return t;
      };
      scope.getPopoverPlacement = function (columnPosition) {
        //columnPosition ranages from 0 to 1
        var placement = 'top';
        if (columnPosition < 0.33)
          placement = 'top-left';
        else if (columnPosition > 0.67)
          placement = 'top-right';
        return placement;
      };
    }
  };
});
// Source: dist/directives/mlhrTableRows.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.directives.mlhrTableRows', [
  'datatorrent.mlhrTable.directives.mlhrTableCell',
  'datatorrent.mlhrTable.filters.mlhrTableRowFilter',
  'datatorrent.mlhrTable.filters.mlhrTableRowSorter',
  'ui.bootstrap'
]).directive('mlhrTableRows', [
  '$filter',
  function ($filter) {
    var tableRowFilter = $filter('mlhrTableRowFilter');
    var tableRowSorter = $filter('mlhrTableRowSorter');
    var limitTo = $filter('limitTo');
    function calculateVisibleRows(scope) {
      if (scope.passThroughFilter) {
        return scope.rows;
      }
      // store visible rows in this variable
      var visible_rows;
      // build cache key using search terms and sorting options
      var cacheKey = JSON.stringify({
          searchTerms: scope.searchTerms,
          sortOrder: scope.sortOrder,
          sortDirection: scope.sortDirection
        });
      // initialize cache if necessary
      scope.filterState.cache = scope.filterState.cache || {};
      // filter and sort if not in cache
      if (!scope.filterState.cache[cacheKey]) {
        scope.filterState.cache[cacheKey] = scope.filterState.cache[cacheKey] || tableRowFilter(scope.rows, scope.columns, scope.searchTerms, scope.filterState, scope.options);
        scope.filterState.cache[cacheKey] = tableRowSorter(scope.filterState.cache[cacheKey], scope.columns, scope.sortOrder, scope.sortDirection, scope.options);
      }
      // update filter count
      scope.filterState.filterCount = scope.filterState.cache[cacheKey].length;
      // get visible rows from filter cache
      visible_rows = limitTo(scope.filterState.cache[cacheKey], Math.floor(scope.rowOffset) - scope.filterState.filterCount);
      // set upper limit if necessary
      visible_rows = limitTo(visible_rows, scope.rowLimit + Math.ceil(scope.rowOffset % 1));
      return visible_rows;
    }
    function link(scope) {
      var updateHandler = function () {
        if (scope.rows) {
          scope.visible_rows = calculateVisibleRows(scope);
        }
      };
      var updateSelection = function () {
        if (scope.selected && scope.selected.length > 0 && scope.options.__selectionColumn) {
          if (scope.options.__selectionColumn.selectObject) {
            // selected array contains entire row of data
            for (var i = 0; i < scope.selected.length; i++) {
              if (scope.rows.indexOf(scope.selected[i]) === -1) {
                scope.selected.splice(i, 1);
                i--;
              }
            }
          } else {
            // selected array contains ids
            var ids = scope.rows.map(function (item) {
                return item[scope.options.__selectionColumn.key];
              });
            for (var i = 0; i < scope.selected.length; i++) {
              if (ids.indexOf(scope.selected[i]) === -1) {
                scope.selected.splice(i, 1);
                i--;
              }
            }
          }
        }
      };
      scope.highlightRowHandler = function (row) {
        return scope.options.highlightRow ? scope.options.highlightRow(row) : false;
      };
      scope.$watch('searchTerms', function (newVal, oldVal) {
        if (scope.scrollDiv.scrollTop() !== 0) {
          // on filter change, scroll to top, let the scroll event update the view
          scope.scrollDiv.scrollTop(0);
        } else {
          // no scroll change, run updateHandler
          updateHandler();
        }
        if (!angular.equals(newVal, oldVal)) {
          scope.$parent.$parent.$emit('searchTerms.changed', scope.searchTerms);
        }
      }, true);
      scope.$watch('[filterState.filterCount,rowOffset,rowLimit]', updateHandler);
      scope.$watch('sortOrder', updateHandler, true);
      scope.$watch('sortDirection', updateHandler, true);
      scope.$watch('rows', function (newVal, oldVal) {
        // clear cache when data changes
        scope.filterState.cache = {};
        updateSelection();
        updateHandler();
        if (angular.isArray(newVal) && angular.isArray(oldVal) && newVal.length < oldVal.length) {
          // because row count is reducing, we should perform scrollHandler to see if we need to 
          // change scrolling or visible rows
          scope.scrollHandler();
        } else if (scope.rows) {
          scope.rowLimit = scope.rows.length;
        }
      }, true);
    }
    return {
      restrict: 'A',
      templateUrl: 'src/templates/mlhrTableRows.tpl.html',
      compile: function (tElement, tAttrs) {
        var tr = tElement.find('tr');
        var repeatString = tr.attr('ng-repeat');
        repeatString += tAttrs.trackBy ? ' track by row[options.trackBy]' : ' track by $index';
        tr.attr('ng-repeat', repeatString);
        return link;
      }
    };
  }
]);
// Source: dist/directives/mlhrTableSelector.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.directives.mlhrTableSelector', []).directive('mlhrTableSelector', function () {
  return {
    restrict: 'A',
    scope: false,
    link: function postLink(scope, element) {
      var selected = scope.selected;
      var column = scope.column;
      element.on('click', function () {
        var row = scope.row;
        scope.options.__selectionColumn = column;
        // Retrieve position in selected list
        var idx = selected.indexOf(column.selectObject ? row : row[column.key]);
        // it is selected, deselect it:
        if (idx >= 0) {
          selected.splice(idx, 1);
        }  // it is not selected, push to list
        else {
          selected.push(column.selectObject ? row : row[column.key]);
        }
        scope.$apply();
      });
    }
  };
});
// Source: dist/filters/mlhrTableRowFilter.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.filters.mlhrTableRowFilter', ['datatorrent.mlhrTable.services.mlhrTableFilterFunctions']).filter('mlhrTableRowFilter', [
  'mlhrTableFilterFunctions',
  '$log',
  function (tableFilterFunctions, $log) {
    return function tableRowFilter(rows, columns, searchTerms, filterState, options) {
      var enabledFilterColumns, result = rows;
      // gather enabled filter functions
      enabledFilterColumns = columns.filter(function (column) {
        // check search term
        var term = searchTerms[column.id];
        if (searchTerms.hasOwnProperty(column.id) && typeof term === 'string') {
          // filter empty strings and whitespace
          if (!term.trim()) {
            return false;
          }
          // check search filter function
          if (typeof column.filter === 'function') {
            return true;
          }
          // not a function, check for predefined filter function
          var predefined = tableFilterFunctions[column.filter];
          if (typeof predefined === 'function') {
            column.filter = predefined;
            return true;
          }
          $log.warn('mlhrTable: The filter function "' + column.filter + '" ' + 'specified by column(id=' + column.id + ').filter ' + 'was not found in predefined tableFilterFunctions. ' + 'Available filters: "' + Object.keys(tableFilterFunctions).join('","') + '"');
        }
        return false;
      });
      // loop through rows and filter on every enabled function
      if (enabledFilterColumns.length) {
        result = rows.filter(function (row) {
          for (var i = enabledFilterColumns.length - 1; i >= 0; i--) {
            var col = enabledFilterColumns[i];
            var filter = col.filter;
            var term = searchTerms[col.id];
            var value = options !== undefined && {}.hasOwnProperty.call(options, 'getter') ? options.getter(col.key, row) : row[col.key];
            var computedValue = typeof col.format === 'function' ? col.format(value, row) : value;
            if (!filter(term, value, computedValue, row)) {
              return false;
            }
          }
          return true;
        });
      }
      filterState.filterCount = result.length;
      return result;
    };
  }
]);
// Source: dist/filters/mlhrTableRowSorter.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.filters.mlhrTableRowSorter', []).filter('mlhrTableRowSorter', function () {
  var column_cache = {};
  function getColumn(columns, id, tableId) {
    var cacheId = tableId + '_' + id;
    if (column_cache.hasOwnProperty(id)) {
      return column_cache[cacheId];
    }
    for (var i = columns.length - 1; i >= 0; i--) {
      if (columns[i].id === id) {
        column_cache[cacheId] = columns[i];
        return columns[i];
      }
    }
  }
  return function tableRowSorter(rows, columns, sortOrder, sortDirection, options) {
    if (!sortOrder.length) {
      return rows;
    }
    var arrayCopy = [];
    for (var i = 0; i < rows.length; i++) {
      arrayCopy.push(rows[i]);
    }
    return arrayCopy.sort(function (a, b) {
      for (var i = 0; i < sortOrder.length; i++) {
        var id = sortOrder[i];
        var column = getColumn(columns, id, options.tableId);
        var dir = sortDirection[id];
        if (column && column.sort) {
          var fn = column.sort;
          var result = dir === '+' ? fn(a, b, options) : fn(b, a, options);
          if (result !== 0) {
            return result;
          }
        }
      }
      return 0;
    });
  };
});
// Source: dist/mlhr-table.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable', [
  'datatorrent.mlhrTable.templates',
  'ui.sortable',
  'ngSanitize',
  'datatorrent.mlhrTable.directives.mlhrTable'
]);
// Source: dist/services/mlhrTableFilterFunctions.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.services.mlhrTableFilterFunctions', []).service('mlhrTableFilterFunctions', function () {
  function like(term, value) {
    term = term.toLowerCase().trim();
    value = value.toLowerCase();
    var first = term[0];
    // negate
    if (first === '!') {
      term = term.substr(1);
      if (term === '') {
        return true;
      }
      return value.indexOf(term) === -1;
    }
    // strict
    if (first === '=') {
      term = term.substr(1);
      return term === value.trim();
    }
    // remove escaping backslashes
    term = term.replace('\\!', '!');
    term = term.replace('\\=', '=');
    return value.indexOf(term) !== -1;
  }
  function likeFormatted(term, value, computedValue, row) {
    return like(term, computedValue, computedValue, row);
  }
  like.placeholder = likeFormatted.placeholder = 'string search';
  like.title = likeFormatted.title = 'Search by text, eg. "foo". Use "!" to exclude and "=" to match exact text, e.g. "!bar" or "=baz".';
  function number(term, value) {
    value = parseFloat(value);
    term = term.trim();
    var first_two = term.substr(0, 2);
    var first_char = term[0];
    var against_1 = term.substr(1) * 1;
    var against_2 = term.substr(2) * 1;
    if (first_two === '<=') {
      return value <= against_2;
    }
    if (first_two === '>=') {
      return value >= against_2;
    }
    if (first_char === '<') {
      return value < against_1;
    }
    if (first_char === '>') {
      return value > against_1;
    }
    if (first_char === '~') {
      return Math.round(value) === against_1;
    }
    if (first_char === '=') {
      return against_1 === value;
    }
    return value.toString().indexOf(term.toString()) > -1;
  }
  function numberFormatted(term, value, computedValue) {
    return number(term, computedValue);
  }
  number.placeholder = numberFormatted.placeholder = 'number search';
  number.title = numberFormatted.title = 'Search by number, e.g. "123". Optionally use comparator expressions like ">=10" or "<1000". Use "~" for approx. int values, eg. "~3" will match "3.2"';
  var unitmap = {};
  unitmap.second = unitmap.sec = unitmap.s = 1000;
  unitmap.minute = unitmap.min = unitmap.m = unitmap.second * 60;
  unitmap.hour = unitmap.hr = unitmap.h = unitmap.minute * 60;
  unitmap.day = unitmap.d = unitmap.hour * 24;
  unitmap.week = unitmap.wk = unitmap.w = unitmap.day * 7;
  unitmap.month = unitmap.week * 4;
  unitmap.year = unitmap.yr = unitmap.y = unitmap.day * 365;
  var clauseExp = /(\d+(?:\.\d+)?)\s*([a-z]+)/;
  function parseDateFilter(string) {
    // split on clauses (if any)
    var clauses = string.trim().split(',');
    var total = 0;
    // parse each clause
    for (var i = 0; i < clauses.length; i++) {
      var clause = clauses[i].trim();
      var terms = clauseExp.exec(clause);
      if (!terms) {
        continue;
      }
      var count = terms[1] * 1;
      var unit = terms[2].replace(/s$/, '');
      if (!unitmap.hasOwnProperty(unit)) {
        continue;
      }
      total += count * unitmap[unit];
    }
    return total;
  }
  function date(term, value, returnBoundary) {
    // today
    // yesterday
    // 1 day ago
    // 2 days ago
    // < 1 day ago
    // < 10 minutes ago
    // < 10 min ago
    // < 10 minutes, 50 seconds ago
    // > 10 min, 30 sec ago
    // > 2 days ago
    // >= 1 day ago
    term = term.trim();
    if (!term) {
      return true;
    }
    value *= 1;
    var nowDate = new Date();
    var now = +nowDate;
    var first_char = term[0];
    var other_chars = term.substr(1).trim();
    var lowerbound, upperbound;
    if (first_char === '<') {
      lowerbound = now - parseDateFilter(other_chars);
      if (returnBoundary) {
        return { min: lowerbound };
      } else {
        return value > lowerbound;
      }
    }
    if (first_char === '>') {
      upperbound = now - parseDateFilter(other_chars);
      if (returnBoundary) {
        return { max: upperbound };
      } else {
        return value < upperbound;
      }
    }
    if (term === 'today') {
      if (returnBoundary) {
        now = +new Date(nowDate.toDateString());
        return {
          min: now,
          max: now + 86399999
        };
      } else {
        return new Date(value).toDateString() === nowDate.toDateString();
      }
    }
    if (term === 'yesterday') {
      if (returnBoundary) {
        now = +new Date(nowDate.toDateString());
        return {
          min: now - 86400000,
          max: now
        };
      } else {
        return new Date(value).toDateString() === new Date(now - unitmap.d).toDateString();
      }
    }
    var supposedDate = new Date(term);
    if (!isNaN(supposedDate)) {
      if (returnBoundary) {
        return {
          min: +supposedDate,
          max: +supposedDate
        };
      } else {
        return new Date(value).toDateString() === supposedDate.toDateString();
      }
    }
    return false;
  }
  date.placeholder = 'date search';
  date.title = 'Search by date. Enter a date string (RFC2822 or ISO 8601 date). You can also type "today", "yesterday", "> 2 days ago", "< 1 day 2 hours ago", etc.';
  function stringToDuration(str) {
    function getVal(str) {
      var units = {
          y: 31536000000,
          ye: 31536000000,
          yea: 31536000000,
          year: 31536000000,
          years: 31536000000,
          mo: 2592000000,
          mon: 2592000000,
          mont: 2592000000,
          month: 2592000000,
          months: 2592000000,
          w: 604800000,
          we: 604800000,
          wee: 604800000,
          week: 604800000,
          weeks: 604800000,
          d: 86400000,
          da: 86400000,
          day: 86400000,
          days: 86400000,
          h: 3600000,
          ho: 3600000,
          hou: 3600000,
          hour: 3600000,
          hours: 3600000,
          mi: 60000,
          min: 60000,
          minu: 60000,
          minut: 60000,
          minute: 60000,
          minutes: 60000,
          '': 1000,
          s: 1000,
          se: 1000,
          sec: 1000,
          seco: 1000,
          secon: 1000,
          second: 1000,
          seconds: 1000
        };
      // ary[2] should be the number (allowing decimal)
      // ary[4] should be the unit
      var ary = str.match(/^( *)(\d+\.?\d*|\d*\.?\d+)( *)(y|ye|yea|year|years|mo|mon|mont|month|months|w|we|wee|week|weeks|d|da|day|days|h|ho|hou|hour|hours|mi|min|minu|minut|minute|minutes|s|se|sec|seco|secon|second|seconds| *)( *$)/i);
      if (ary) {
        // the expression was a number and one of the units above
        return ary[2] * units[ary[4]];
      }
      // got here means the expression could be in the hh:mm:ss format
      // ary[2] should be the hours
      // ary[3] should be the minutes
      // ary[4] should be the seconds (if exist)
      ary = str.match(/(^ *)(\d\d|\d)(:\d\d)(:\d\d)?( *$)/);
      if (ary && ary[4]) {
        return ary[2] * units.hours + ary[3].substr(1) * units.minutes + ary[4].substr(1) * units.seconds;
      } else if (ary) {
        return ary[2] * units.hours + ary[3].substr(1) * units.minutes;
      }
      // got here means the expression is not recognized
      return NaN;
    }
    // end getVal function
    var val = 0;
    if (str) {
      var ary = str.split(',');
      for (var i = 0; i < ary.length; i++) {
        val += getVal(ary[i]);
      }
    }
    return val;
  }
  function duration(term, value) {
    if (typeof value !== 'number' || isNaN(value)) {
      // we expect value to be a number and in milliseconds
      return false;
    }
    // default filter to true to show the row
    var filterState = true;
    // break expressions into groups delimited by ampersand (&)
    var termArray = term.split('&');
    var ary, operator, exp, filterValue;
    // loop through each expression and perform the comparison
    // we'll exit the loop if the filterState becomes false
    // false means one of the expressions does not yield a
    // true condition
    for (var i = 0; i < termArray.length && filterState; i++) {
      // parse operands and expression
      // ary[2] should be the operator
      // ary[4] should be the expression
      ary = termArray[i].match(/^( *)(<=|>=|>|<|=| *)( *)(.*)/);
      if (ary) {
        operator = ary[2] || '=';
        // default to equal sign if user doesn't enter an operator
        exp = ary[4];
        if (exp && !isNaN(filterValue = stringToDuration(exp))) {
          // now compare the row value with the expression entered by the user
          if (operator === '<=') {
            filterState = value <= filterValue;
          } else if (operator === '>=') {
            filterState = value >= filterValue;
          } else if (operator === '>') {
            filterState = value > filterValue;
          } else if (operator === '<') {
            filterState = value < filterValue;
          } else if (operator === '=') {
            filterState = value === filterValue;
          }
        } else {
          // expression is invalid, return false to hide row
          return false;
        }
      }
    }
    return filterState;
  }
  function durationFormatted(term, value, formatted) {
    return duration(term, stringToDuration(formatted));
  }
  duration.placeholder = durationFormatted.placeholder = 'duration search';
  duration.title = durationFormatted.title = 'Search by duration, e.g.:\n"<= 30 minutes",\n"= 1 hour",\n">= 1 day, 4 hours" or\n "> 2.5 days & < 3 days".\nDefault operator is "=" and unit is "second".\nThus searching "60", "60 seconds", or "= 60" are equivalent to "= 60 seconds".';
  function stringToMemory(str, toUnit) {
    function getVal(str) {
      var units = {
          bb: 1.2379400392853803e+27,
          yb: 1.2089258196146292e+24,
          zb: 1.1805916207174113e+21,
          eb: 1152921504606847000,
          pb: 1125899906842624,
          tb: 1099511627776,
          gb: 1073741824,
          '': 1048576,
          mb: 1048576,
          kb: 1024,
          b: 1
        };
      // ary[2] should be the number (allowing decimal)
      // ary[4] should be the unit
      var ary = str.match(/^( *)(\d+\.?\d*|\d*\.?\d+)( *)(b|kb|mb|gb|tb|pb|eb|zb|yb|bb| *)( *$)/i);
      if (ary) {
        // the expression was a number and one of the units above
        return ary[2] * units[ary[4].toLowerCase()] / units[(toUnit || 'b').toLowerCase()];
      }
      // got here means the expression is not recognized
      return NaN;
    }
    // end getVal function
    var val = 0;
    if (str) {
      var ary = str.split(',');
      for (var i = 0; i < ary.length; i++) {
        val += getVal(ary[i]);
      }
    }
    return val;
  }
  function memory(term, value) {
    if (typeof value !== 'number' || isNaN(value)) {
      // we expect value to be a number and in bytes
      return false;
    }
    // default filter to true to show the row
    var filterState = true;
    // break expressions into groups delimited by ampersand (&)
    var termArray = term.split('&');
    var ary, operator, exp, filterValue;
    // loop through each expression and perform the comparison
    // we'll exit the loop if the filterState becomes false
    // false means one of the expressions does not yield a
    // true condition
    for (var i = 0; i < termArray.length && filterState; i++) {
      // parse operands and expression
      // ary[2] should be the operator
      // ary[4] should be the expression
      ary = termArray[i].match(/^( *)(<=|>=|>|<|=| *)( *)(.*)/);
      if (ary) {
        operator = ary[2] || '=';
        // default to equal sign if user doesn't enter an operator
        exp = ary[4];
        if (exp && !isNaN(filterValue = stringToMemory(exp))) {
          // now compare the row value with the expression entered by the user
          if (operator === '<=') {
            filterState = value <= filterValue;
          } else if (operator === '>=') {
            filterState = value >= filterValue;
          } else if (operator === '>') {
            filterState = value > filterValue;
          } else if (operator === '<') {
            filterState = value < filterValue;
          } else if (operator === '=') {
            filterState = value === filterValue;
          }
        } else {
          // expression is invalid, return false to hide row
          return false;
        }
      }
    }
    return filterState;
  }
  function memoryFormatted(term, value, formatted) {
    return memory(term, stringToMemory(formatted));
  }
  memory.placeholder = memoryFormatted.placeholder = 'memory search';
  memory.title = memoryFormatted.title = 'Search by memory using expressions, e.g.\n"> 512mb", "= 1.5GB", or\n">= 128GB & <= 256GB".\nUnits are not case sensitive.\nDefault operator is "=" and unit is "MB".\nThus searching "128", "= 128" or "128 MB" are equivalent to "= 128 MB".';
  return {
    like: like,
    likeFormatted: likeFormatted,
    number: number,
    numberFormatted: numberFormatted,
    date: date,
    duration: duration,
    durationFormatted: durationFormatted,
    stringToDuration: stringToDuration,
    memory: memory,
    memoryFormatted: memoryFormatted,
    stringToMemory: stringToMemory
  };
});
// Source: dist/services/mlhrTableFormatFunctions.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.services.mlhrTableFormatFunctions', []).service('mlhrTableFormatFunctions', function () {
  // TODO: add some default format functions
  return {};
});
// Source: dist/services/mlhrTableSortFunctions.js
/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
angular.module('datatorrent.mlhrTable.services.mlhrTableSortFunctions', []).service('mlhrTableSortFunctions', [
  'mlhrTableFilterFunctions',
  function (mlhrTableFilterFunctions) {
    return {
      number: function (field) {
        return function (row1, row2, options) {
          var val1, val2;
          if (options !== undefined && {}.hasOwnProperty.call(options, 'getter')) {
            val1 = options.getter(field, row1);
            val2 = options.getter(field, row2);
          } else {
            val1 = row1[field];
            val2 = row2[field];
          }
          return val1 * 1 - val2 * 1;
        };
      },
      string: function (field) {
        return function (row1, row2, options) {
          var val1, val2;
          if (options !== undefined && {}.hasOwnProperty.call(options, 'getter')) {
            val1 = options.getter(field, row1);
            val2 = options.getter(field, row2);
          } else {
            val1 = row1[field];
            val2 = row2[field];
          }
          if (val1.toString().toLowerCase() === val2.toString().toLowerCase()) {
            return 0;
          }
          return val1.toString().toLowerCase() > val2.toString().toLowerCase() ? 1 : -1;
        };
      },
      durationFormatted: function (field) {
        return function (row1, row2, options) {
          var val1 = mlhrTableFilterFunctions.stringToDuration(row1[field]);
          var val2 = mlhrTableFilterFunctions.stringToDuration(row2[field]);
          return val1 > val2 ? 1 : -1;
        };
      },
      memoryFormatted: function (field) {
        return function (row1, row2, options) {
          var val1 = mlhrTableFilterFunctions.stringToMemory(row1[field]);
          var val2 = mlhrTableFilterFunctions.stringToMemory(row2[field]);
          return val1 > val2 ? 1 : -1;
        };
      }
    };
  }
]);
// Source: dist/templates.js
angular.module('datatorrent.mlhrTable.templates', [
  'src/templates/mlhrTable.tpl.html',
  'src/templates/mlhrTableDummyRows.tpl.html',
  'src/templates/mlhrTableRows.tpl.html'
]);
angular.module('src/templates/mlhrTable.tpl.html', []).run([
  '$templateCache',
  function ($templateCache) {
    $templateCache.put('src/templates/mlhrTable.tpl.html', '<div class="mlhr-table-wrapper">\n' + '  <div class="mlhr-rows-table-wrapper">\n' + '    <table ng-class="classes" class="mlhr-table mlhr-header-table">\n' + '      <thead>\n' + '        <tr ui-sortable="sortableOptions" ng-model="columns">\n' + '          <th \n' + '            scope="col" \n' + '            ng-repeat="column in columns" \n' + '            ng-click="toggleSort($event,column)" \n' + '            ng-class="{\'sortable-column\' : column.sort, \'select-column\': column.selector}"\n' + '            ng-style="{ width: column.width, \'min-width\': column.width, \'max-width\': column.width }"\n' + '          >\n' + '            <span \n' + '              class="mlhr-table-header-label" \n' + '              ng-class="{ \'column-selector\': column.selector, \'column-text\': !column.selector }"\n' + '              mlhr-table-header-label\n' + '              uib-popover-html="getPopoverText((column.hasOwnProperty(\'label\') ? column.label : column.id), column.title)"\n' + '              popover-trigger="{{ \'mouseenter\' }}"\n' + '              popover-placement=\'{{getPopoverPlacement($index/(columns.length-1))}}\'\n' + '              popover-append-to-body="true">\n' + '              <input ng-if="column.selector" type="checkbox" ng-checked="isSelectedAll()" ng-click="toggleSelectAll($event)" />\n' + '              {{column.hasOwnProperty(\'label\') ? column.label : column.id }}\n' + '              <span \n' + '                ng-if="column.sort" \n' + '                title="This column is sortable. Click to toggle sort order. Hold shift while clicking multiple columns to stack sorting."\n' + '                class="sorting-icon {{ getSortClass( sortDirection[column.id] ) }}"\n' + '              ></span>\n' + '            </span>\n' + '            <span \n' + '              ng-if="!column.lockWidth"\n' + '              ng-class="{\'discreet-width\': !!column.width, \'column-resizer\': true}"\n' + '              title="Click and drag to set discreet width. Click once to clear discreet width."\n' + '              ng-mousedown="startColumnResize($event, column)"\n' + '            >\n' + '              &nbsp;\n' + '            </span>\n' + '          </th>\n' + '        </tr>\n' + '        <tr ng-if="hasFilterFields()" class="mlhr-table-filter-row">\n' + '          <td ng-repeat="column in columns" ng-class="\'column-\' + column.id">\n' + '            <input \n' + '              type="text"\n' + '              ng-if="(column.filter)"\n' + '              ng-model="searchTerms[column.id]"\n' + '              ng-attr-placeholder="{{ column.filter && column.filter.placeholder }}"\n' + '              ng-attr-title="{{ column.filter && column.filter.title }}"\n' + '              ng-class="{\'active\': searchTerms[column.id] }"\n' + '            >\n' + '            <button \n' + '              ng-if="(column.filter)"\n' + '              ng-show="searchTerms[column.id]"\n' + '              class="clear-search-btn"\n' + '              role="button"\n' + '              type="button"\n' + '              ng-click="clearAndFocusSearch(column.id)"\n' + '            >\n' + '              &times;\n' + '            </button>\n' + '\n' + '          </td>\n' + '        </tr>\n' + '      </thead>\n' + '    </table>\n' + '    <table ng-class="classes" class="mlhr-table mlhr-dummy-table mlhr-rows-scroller">\n' + '      <tbody mlhr-table-dummy-rows\n' + '        mlhr-table-dummy-rows-filtered-count="filterState.filterCount"\n' + '        mlhr-table-dummy-rows-visible-count="visible_rows.length"\n' + '        columns="columns"\n' + '        cell-content="..."></tbody>\n' + '    </table>\n' + '    <table ng-class="classes" class="mlhr-table mlhr-rows-table">\n' + '      <thead>\n' + '        <th \n' + '            scope="col"\n' + '            ng-repeat="column in columns" \n' + '            ng-style="{ width: column.width, \'min-width\': column.width, \'max-width\': column.width }"\n' + '          ></th>\n' + '        </tr>\n' + '      </thead>\n' + '      <tbody>\n' + '        <tr ng-if="visible_rows.length === 0">\n' + '          <td ng-attr-colspan="{{columns.length}}" class="space-holder-row-cell">\n' + '            <div ng-if="options.loadingError">\n' + '              <div ng-if="!options.loading && options.loadingErrorTemplateUrl" ng-include="options.loadingErrorTemplateUrl"></div>\n' + '              <div ng-if="!options.loading && !options.loadingErrorTemplateUrl">{{ options.loadingErrorText }}</div>\n' + '            </div>\n' + '            <div ng-if="!options.loadingError">\n' + '              <div ng-if="options.loading && options.loadingTemplateUrl" ng-include="options.loadingTemplateUrl"></div>\n' + '              <div ng-if="options.loading && !options.loadingTemplateUrl">{{ options.loadingText }}</div>\n' + '              <div ng-if="!options.loading && options.noRowsTemplateUrl" ng-include="options.noRowsTemplateUrl"></div>\n' + '              <div ng-if="!options.loading && !options.noRowsTemplateUrl">{{ options.noRowsText }}</div>\n' + '            </div>\n' + '          </td>\n' + '        </tr>\n' + '      </tbody>\n' + '      <tbody mlhr-table-rows class="mlhr-table-rendered-rows"></tbody>\n' + '    </table>\n' + '  </div>\n' + '</div>\n' + '');
  }
]);
angular.module('src/templates/mlhrTableDummyRows.tpl.html', []).run([
  '$templateCache',
  function ($templateCache) {
    $templateCache.put('src/templates/mlhrTableDummyRows.tpl.html', '');
  }
]);
angular.module('src/templates/mlhrTableRows.tpl.html', []).run([
  '$templateCache',
  function ($templateCache) {
    $templateCache.put('src/templates/mlhrTableRows.tpl.html', '<tr ng-repeat="row in visible_rows" \n' + '  ng-class="{highlight: highlightRowHandler(row)}"\n' + '  ng-attr-class="{{ (rowOffset + $index) % 2 ? \'odd\' : \'even\' }}">\n' + '\n' + '  <td ng-repeat="column in columns track by column.id"\n' + '    class="mlhr-table-cell {{ column.cssClass }}"\n' + '    ng-class="{ \'column-selector\': column.selector }"\n' + '    mlhr-table-cell\n' + '    uib-popover-html="getPopoverText()"\n' + '    popover-class="{{ column.popoverClass || \'mlhr-table-cell-popover-text \' + column.popoverClass }}"\n' + '    popover-title="{{ getPopoverTitle() }}"\n' + '    popover-trigger="{{ column.popoverTrigger || \'mouseenter\' }}"\n' + '    popover-popup-delay="{{ column.popoverPopupDelay || 1000 }}"\n' + '    popover-placement=\'{{column.popoverPlacement || getPopoverPlacement($index/(columns.length-1))}}\'\n' + '    popover-append-to-body="true">\n' + '  </td>\n' + '\n' + '</tr>\n' + '');
  }
]);