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

angular.module('datatorrent.mlhrTable.directives.mlhrTableCell', [
  'datatorrent.mlhrTable.directives.mlhrTableSelector'
])

.directive('mlhrTableCell', function($compile, $interpolate) {

  function link(scope, element) {
    var column = scope.column;
    var cellMarkup = '';
    if (column.template) {
      cellMarkup = column.template;
    }
    else if (column.templateUrl) {
      cellMarkup = '<div ng-include="\'' + column.templateUrl + '\'"></div>';
    }
    else if (column.selector === true) {
      cellMarkup = '<input type="checkbox" ng-checked="selected.indexOf(column.selectObject ? row : row[column.key]) >= 0" mlhr-table-selector class="mlhr-table-selector" />';
    }
    else if (column.ngFilter) {
      cellMarkup = '{{ row[column.key] | ' + column.ngFilter + '}}';
    }
    else if (column.format) {
      if (scope.options !== undefined && {}.hasOwnProperty.call(scope.options, 'getter')) {
        cellMarkup = '{{ column.format(options.getter(column.key, row), row, column) }}';
      } else {
        cellMarkup = '{{ column.format(row[column.key], row, column) }}';
      }
    }
    else if(scope.options !== undefined && {}.hasOwnProperty.call(scope.options, 'getter')) {
      cellMarkup = '{{ options.getter(column.key, row) }}';
    }
    else {
      cellMarkup = '{{ row[column.key] }}';
    }
    element.html(cellMarkup);
    $compile(element.contents())(scope);

    scope.getPopoverTitle = function() {
      return (column.popoverTitle ? scope.$eval($interpolate(column.popoverTitle)) : '');
    }

    scope.getPopoverText = function() {
      return (!column.disablePopover && element[0].clientWidth < element[0].scrollWidth ? element.html() : '');
    }

    scope.getPopoverPlacement = function(columnPosition) { //columnPosition ranages from 0 to 1
      var placement = 'top';
      if (columnPosition < 0.33)
        placement = 'top-left';
      else if (columnPosition > 0.67) 
        placement = 'top-right';
      return placement;
    }
  }

  return {
    scope: true,
    link: link
  };
});