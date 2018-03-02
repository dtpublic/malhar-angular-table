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
'use strict';

angular.module('datatorrent.mlhrTable.directives.mlhrTable', [
  'datatorrent.mlhrTable.controllers.MlhrTableController',
  'datatorrent.mlhrTable.directives.mlhrTableRows',
  'datatorrent.mlhrTable.directives.mlhrTableHeaderLabel',
  'datatorrent.mlhrTable.directives.mlhrTableDummyRows'
])

.directive('mlhrTable', ['$log', '$timeout', '$q', '$window', function ($log, $timeout, $q, $window) {

  function debounce(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
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

    return function() {
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
      var count = scope.columns.filter(function(col) { return col.id === 'selector' }).length;
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
      scope.columns.forEach(function(col) {
        if ((col.width + '').indexOf('%') > -1) {
          widths += parseFloat(col.width) / 100 * tableWidth;
        }  else {
        widths += parseFloat(col.width);
        }
      });
      if (widths < tableWidth) {
        // get last column that is not the column being resized and the lockWidth is not true
        for(var i = scope.columns.length - 1; i > 0; i--) {
          if (scope.columns[i].id !== id && !scope.columns[i].lockWidth && scope.columns[i].id !== 'selector') {
            // we can delete the width of this column
            delete scope.columns[i].width;
            break;
          }
        }
      }
    }

    scope.$on('__column.resized__', function(event, column) {
      adjustColumnWidths(column);
      scope.$parent.$parent.$emit('column.resized', column);
    });
    scope.$on('__column.sorted__', function(event, column) {
      scope.$parent.$parent.$emit('column.sorted', column);
    });
    scope.$on('__column.moved__', function(event, columnPositions) {
      scope.$parent.$parent.$emit('column.moved', columnPositions);
    });

    // we also want to make sure the selection column doesn't expand when the browser resizes
    $($window).on('resize', adjustColumnWidths);

    // remove window resize event
    scope.$on('$destroy', function() {
      $($window).off('resize', adjustColumnWidths);
    });

    var REFRESH_FRAME_RATE = 500;     // Throttle the bodyHeight update to .5 second

    // determine requestAnimationFrame compabitility
    var raf = window.requestAnimationFrame
            || window.mozRequestAnimationFrame
            || window.webkitRequestAnimationFrame
            || window.msRequestAnimationFrame
            || function(f) { return setTimeout(f, scope.options.scrollDebounce) };

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
    scope.filterState = {
      filterCount: scope.rows ? scope.rows.length : 0
    };

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
      onRegisterApi: function(api) {
        // noop - user overrides and gets a hold of api object
      }
    });

    // Look for initial sort order
    if (scope.options.initialSorts) {
      angular.forEach(scope.options.initialSorts, function(sort) {
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


    var bodyHeightChanged = function() {
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
    var bodyHeightWatchLoop = function() {
      if (scope.options.bodyHeight !== bodyHeightSaved && Date.now() - lastBodyHeightUpdated > REFRESH_FRAME_RATE) {
        lastBodyHeightUpdated = Date.now();
        bodyHeightSaved = scope.options.bodyHeight;
        bodyHeightChanged();
      }
      rafid1 = raf(bodyHeightWatchLoop);
    };
    rafid1 = raf(bodyHeightWatchLoop);

    scope.$watch('rowHeight', function(size) {
      element.find('tr.mlhr-table-dummy-row').css('background-size','auto ' + size * scope.options.bgSizeMultiplier + 'px');
    });

    var scrollDeferred;
    var scrollTopSaved = -1;
    var rafid2;
    var loop = function(timeStamp) {
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

    scope.scrollHandler = function() {

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
    $timeout(function() {
      // Calculates rowHeight and rowLimit
      scope.calculateRowLimit();
    }, 0);

    scope.api = {
      isSelectedAll: scope.isSelectedAll,
      selectAll: scope.selectAll,
      deselectAll: scope.deselectAll,
      toggleSelectAll: scope.toggleSelectAll,
      setLoading: function(isLoading, triggerDigest) {
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
      scope.options.loadingPromise.then(
        function(){
          scope.options.loadingError = false;
          scope.api.setLoading(false);
        },
        function(reason){
          scope.options.loadingError = true;
          scope.api.setLoading(false);
          $log.warn('Failed loading table data: ' + reason);
        }
      );
    } else { //scope.options.loadingPromise is optional, not required. So, when it's not specified, scope.options.loading should be set to false. Otherwise, spinner wheel will hang there forever where there is no rows.
      scope.api.setLoading(false);
    }

    scope.$on('$destroy', function() {
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
    compile: function(tElement) {
      var trackBy = tElement.attr('track-by');
      if (trackBy) {
        tElement.find('.mlhr-table-rendered-rows').attr('track-by', trackBy);
      }
      return link;
    }
  };
}]);
