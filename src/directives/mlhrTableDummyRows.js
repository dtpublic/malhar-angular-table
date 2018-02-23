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

/**
 * @ngdoc directive
 * @name datatorrent.mlhrTable.directive:mlhrTableDummyRows
 * @restrict A
 * @description inserts dummy <tr>s for non-rendered rows
 * @element tbody
 * @example <tbody mlhr-table-dummy-rows mlhr-table-dummy-rows-filtered-count="filteredState.filterCount" mlhr-table-dummy-rows-visible-count="visible_rows.length"  columns="[column array]"></tbody>
**/
angular.module('datatorrent.mlhrTable.directives.mlhrTableDummyRows', [])
.directive('mlhrTableDummyRows', function() {

  return {
    template: '<tr class="mlhr-table-dummy-row" ng-style="{ height: dummyRowHeight + \'px\'}"><td ng-show="dummyRowHeight" ng-attr-colspan="{{columns.length}}"></td></tr>',
    scope: true,
    link: function(scope, element, attrs) {
      scope.$parent.dummyScope = scope;
      scope.updateHeight = function() {
        if (!scope.$parent.options.ignoreDummyRows && scope.$parent.tableRows && scope.$parent.filterState && scope.$parent.visible_rows) {
          scope.dummyRowHeight = (scope.$parent.filterState.filterCount - scope.$parent.visible_rows.length) * scope.rowHeight;
          var rowHeight = scope.$parent.tableRows.height() / scope.$parent.visible_rows.length;
          scope.$parent.tableRows.css('top', '-' + (scope.dummyRowHeight - rowHeight * scope.$parent.rowOffset) + 'px');
        }
      }
      scope.$watch(attrs.mlhrTableDummyRowsFilteredCount, function(newVal, oldVal) {
        if (newVal !== oldVal) {
          scope.updateHeight();
        }
      });
      scope.$watch(attrs.mlhrTableDummyRowsVisibleCount, function(newVal, oldVal) {
        if (newVal !== oldVal) {
          scope.updateHeight();
        }
      });
    }
  };
});