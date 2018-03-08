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

angular.module('datatorrent.mlhrTable.directives.mlhrTableHeaderLabel', [])

.directive('mlhrTableHeaderLabel', function() {
  return {
    scope: true,
    link: function(scope, element) {
      scope.getPopoverText = function(label, description) {
        var t = '';
        if (element[0].offsetWidth < element[0].scrollWidth) { //label is truncated
          t = '<b>' + label + '</b>';
          if (description) {
            t += '<br>' + description;
          }
        }
        else {
          if (description) {
            t = description;
          }
        }
        return t;
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
  };
});
