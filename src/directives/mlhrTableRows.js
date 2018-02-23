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

angular.module('datatorrent.mlhrTable.directives.mlhrTableRows',[
  'datatorrent.mlhrTable.directives.mlhrTableCell',
  'datatorrent.mlhrTable.filters.mlhrTableRowFilter',
  'datatorrent.mlhrTable.filters.mlhrTableRowSorter',
  'ui.bootstrap'
])

.directive('mlhrTableRows', function($filter) {

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
      scope.filterState.cache[cacheKey]= scope.filterState.cache[cacheKey] || tableRowFilter(scope.rows, scope.columns, scope.searchTerms, scope.filterState, scope.options);
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

      var updateHandler = function() {
        if (scope.rows) {
          scope.visible_rows = calculateVisibleRows(scope);
        }
      };

      var updateSelection = function() {
        if (scope.selected && scope.selected.length > 0 && scope.options.__selectionColumn) {
          if (scope.options.__selectionColumn.selectObject) {
            // selected array contains entire row of data
            for(var i = 0; i < scope.selected.length; i++) {
              if (scope.rows.indexOf(scope.selected[i]) === -1) {
                scope.selected.splice(i, 1);
                i--;
              }
            }
          } else {
            // selected array contains ids
            var ids = scope.rows.map(function(item) {
              return item[scope.options.__selectionColumn.key];
            });
            for(var i = 0; i < scope.selected.length; i++) {
              if (ids.indexOf(scope.selected[i]) === -1) {
                scope.selected.splice(i, 1);
                i--;
              }
            }
          }
        }
      };

      scope.highlightRowHandler = function(row) {
        return (scope.options.highlightRow ? scope.options.highlightRow(row) : false);
      };

      scope.$watch('searchTerms', function(newVal, oldVal) {
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
      scope.$watch('rows', function(newVal, oldVal){
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
    compile: function(tElement, tAttrs) {
      var tr = tElement.find('tr');
      var repeatString = tr.attr('ng-repeat');
      repeatString += tAttrs.trackBy ? ' track by row[options.trackBy]' : ' track by $index';
      tr.attr('ng-repeat', repeatString);
      return link;
    }
  };
});
