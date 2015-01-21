angular.module('datatorrent.mlhrTable.templates', ['src/templates/mlhrTable.tpl.html', 'src/templates/mlhrTableDummyRows.tpl.html', 'src/templates/mlhrTableRows.tpl.html']);

angular.module("src/templates/mlhrTable.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("src/templates/mlhrTable.tpl.html",
    "<div class=\"mlhr-table-wrapper\">\n" +
    "  <table ng-class=\"classes\" class=\"mlhr-table mlhr-header-table\">\n" +
    "    <thead>\n" +
    "      <tr ui-sortable=\"sortableOptions\" ng-model=\"columns\">\n" +
    "        <th \n" +
    "          scope=\"col\" \n" +
    "          ng-repeat=\"column in columns\" \n" +
    "          ng-click=\"toggleSort($event,column)\" \n" +
    "          ng-class=\"{'sortable-column' : column.sort}\" \n" +
    "          ng-attr-title=\"{{ column.title || '' }}\"\n" +
    "          ng-style=\"{ width: column.width, 'min-width': column.width, 'max-width': column.width }\"\n" +
    "        >\n" +
    "          <span class=\"column-text\">\n" +
    "            {{column.hasOwnProperty('label') ? column.label : column.id }}\n" +
    "            <span \n" +
    "              ng-if=\"column.sort\" \n" +
    "              title=\"This column is sortable. Click to toggle sort order. Hold shift while clicking multiple columns to stack sorting.\"\n" +
    "              class=\"sorting-icon {{ getSortClass( sortDirection[column.id] ) }}\"\n" +
    "            ></span>\n" +
    "          </span>\n" +
    "          <span \n" +
    "            ng-if=\"!column.lockWidth\"\n" +
    "            ng-class=\"{'discreet-width': !!column.width, 'column-resizer': true}\"\n" +
    "            title=\"Click and drag to set discreet width. Click once to clear discreet width.\"\n" +
    "            ng-mousedown=\"startColumnResize($event, column)\"\n" +
    "          >\n" +
    "            &nbsp;\n" +
    "          </span>\n" +
    "        </th>\n" +
    "      </tr>\n" +
    "      <tr ng-if=\"hasFilterFields()\" class=\"mlhr-table-filter-row\">\n" +
    "        <td ng-repeat=\"column in columns\" ng-class=\"'column-' + column.id\">\n" +
    "          <input \n" +
    "            type=\"text\"\n" +
    "            ng-if=\"(column.filter)\"\n" +
    "            ng-model=\"searchTerms[column.id]\"\n" +
    "            ng-attr-placeholder=\"{{ column.filter && column.filter.placeholder }}\"\n" +
    "            ng-attr-title=\"{{ column.filter && column.filter.title }}\"\n" +
    "            ng-class=\"{'active': searchTerms[column.id] }\"\n" +
    "          >\n" +
    "          <button \n" +
    "            ng-if=\"(column.filter)\"\n" +
    "            ng-show=\"searchTerms[column.id]\"\n" +
    "            class=\"clear-search-btn\"\n" +
    "            role=\"button\"\n" +
    "            type=\"button\"\n" +
    "            ng-click=\"clearAndFocusSearch(column.id)\"\n" +
    "          >\n" +
    "            &times;\n" +
    "          </button>\n" +
    "\n" +
    "        </td>\n" +
    "      </tr>\n" +
    "    </thead>\n" +
    "  </table>\n" +
    "  <div class=\"mlhr-rows-table-wrapper\" ng-style=\"tbodyNgStyle\">\n" +
    "    <table ng-class=\"classes\" class=\"mlhr-table mlhr-rows-table\">\n" +
    "      <thead>\n" +
    "        <th \n" +
    "            scope=\"col\"\n" +
    "            ng-repeat=\"column in columns\" \n" +
    "            ng-style=\"{ width: column.width, 'min-width': column.width, 'max-width': column.width }\"\n" +
    "          ></th>\n" +
    "        </tr>\n" +
    "      </thead>\n" +
    "      <tbody>\n" +
    "        <tr ng-if=\"visible_rows.length === 0\">\n" +
    "          <td ng-attr-colspan=\"{{columns.length}}\" class=\"space-holder-row-cell\">\n" +
    "            <div ng-if=\"options.loading && options.loadingTemplateUrl\" ng-include=\"options.loadingTemplateUrl\"></div>\n" +
    "            <div ng-if=\"options.loading && !options.loadingTemplateUrl\">{{ options.loadingText }}</div>\n" +
    "            <div ng-if=\"!options.loading && options.noRowsTemplateUrl\" ng-include=\"options.noRowsTemplateUrl\"></div>\n" +
    "            <div ng-if=\"!options.loading && !options.noRowsTemplateUrl\">{{ options.noRowsText }}</div>\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "      </tbody>\n" +
    "      <tbody mlhr-table-dummy-rows=\"rowOffset\" columns=\"columns\" cell-content=\"...\"></tbody>\n" +
    "      <tbody mlhr-table-rows class=\"mlhr-table-rendered-rows\"></tbody>\n" +
    "      <tbody mlhr-table-dummy-rows=\"filterState.filterCount - rowOffset - visible_rows.length\" columns=\"columns\" cell-content=\"...\"></tbody>\n" +
    "    </table>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("src/templates/mlhrTableDummyRows.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("src/templates/mlhrTableDummyRows.tpl.html",
    "");
}]);

angular.module("src/templates/mlhrTableRows.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("src/templates/mlhrTableRows.tpl.html",
    "<tr ng-repeat=\"row in visible_rows\" ng-attr-class=\"{{ (rowOffset + $index) % 2 ? 'odd' : 'even' }}\">\n" +
    "  <td ng-repeat=\"column in columns track by column.id\" class=\"mlhr-table-cell\" mlhr-table-cell></td>\n" +
    "</tr>");
}]);
