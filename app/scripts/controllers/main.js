'use strict';

angular.module('datatorrent.mlhrTable.ghPage')

  // angular filter, to be used with the "ngFilter" option in column definitions below
  .filter('commaGroups', function() {

    // Converts a number like 123456789 to string with appropriate commas: "123,456,789"
    function commaGroups(value) {
      if (typeof value === 'undefined') {
        return '-';
      }
      var parts = value.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }
    return commaGroups;
  })
  .filter('duration', function() {
    var unitsMap = [
      {
        text: 'year',
        val: 31536000000
      },
      {
        text: 'month',
        val: 2592000000
      },
      {
        text: 'week',
        val: 604800000
      },
      {
        text: 'day',
        val: 86400000
      },
      {
        text: 'hour',
        val: 3600000
      },
      {
        text: 'minute',
        val: 60000
      },
      {
        text: 'second',
        val: 1000
      }
    ];

    return function(duration) {
      var result = [];

      function getVal(num, idx) {
        var val = Math.floor(num / unitsMap[idx].val);
        var remain = num - val * unitsMap[idx].val;
        if (val > 0) {
          result.push(val + ' ' + unitsMap[idx].text + (val > 1 ? 's' : ''));
        }
        if (remain >= 1000 && result.length < 2) {
          getVal(remain, idx + 1);
        }
      }

      getVal(duration, 0);
      return result.join(', ');
    };
  })
  .filter('memory', function() {
    return function(memory) {
      var unitsMap = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
      var q;
      var r;

      for(var i = unitsMap.length - 1; i > 0; i--) {
        q = Math.floor(memory / Math.pow(1024, i));
        if (q > 0) {
          r = Math.ceil((memory - q * Math.pow(1024, i)) / Math.pow(1024, i) * 10) / 10;
          q += r;
          break;
        }
      }
      if (i === 0) {
        return memory + ' ' + unitsMap[i];
      } else {
        return q + ' ' + unitsMap[i];
      }
    };
  })
  .controller('MainCtrl', function ($scope, $templateCache, $q) {

    // Format functions, used with the "format" option in column definitions below
    // converts number in inches to display string, eg. 69 => 5'9"
    function inches2feet(inches, model){
      var feet = Math.floor(inches/12);
      inches = inches % 12;
      return feet + '\'' + inches + '"';
    }
    // Custom column filtering function:
    //  If the user types "tall", only people who
    //  are taller than 70 inches will be displayed.
    function feet_filter(term, value, formatted, model) {
      if (term === 'tall') { return value > 70; }
      if (term === 'short') { return value < 69; }
      return true;
    }
    feet_filter.title = 'Type in "short" or "tall"';

    // Generates `num` random rows
    function genRows(num){
      var retVal = [];
      var id = 0;
      if ($scope.my_table_data.length > 0) {
        id = $scope.my_table_data.map(function(row) {
                return row.id;
              }).sort(function(a, b) {
                return b - a;
              })[0] + 1;
      }
      for (var i=0; i < num; i++) {
        retVal.push(genRow(id++));
      }
      return retVal;
    }

    // Generates a row with random data
    function genRow(id){
      var fnames = ['joe','fred','frank','jim','mike','gary','aziz'];
      var lnames = ['sterling','smith','erickson','burke','ansari'];
      var seed = Math.random();
      var seed2 = Math.random();
      var first_name = fnames[ Math.round( seed * (fnames.length -1) ) ];
      var last_name = lnames[ Math.round( seed * (lnames.length -1) ) ];
      
      return {
        id: id,
        selected: false,
        first_name: first_name,
        last_name: last_name,
        age: Math.ceil(seed * 75) + 15,
        height: Math.round( seed2 * 36 ) + 48,
        weight: Math.round( seed2 * 130 ) + 90,
        likes: Math.round(seed2 * seed * 1000000),
        duration: Math.floor(Math.random() * 100000000 * (id + 1)),
        memory: Math.floor(Math.round(seed2 * seed * 10000000))
      };
    }

    // Simulate location of template file
    $templateCache.put('path/to/example/template.html', '<em>{{row[column.key]}}</em>');
        
    // Table column definition objects
    $scope.my_table_columns = [
      { id: 'selected', key: 'id', label: '', width: 30, lockWidth: true, selector: true },
      // { id: 'selected', key: 'id', label: '', width: 30, lockWidth: true, selector: true, selectObject: true },
      { id: 'ID', key: 'id', label: 'ID', sort: 'number', filter: 'number' },
      { id: 'first_name', key: 'first_name', label: 'First Name', title: 'Employee first name', sort: 'string', filter: 'like', template: '<strong>{{row[column.key]}}</strong>' },
      { id: 'last_name', key: 'last_name', label: 'Last Name', title: 'Employee last name', sort: 'string', filter: 'like', templateUrl: 'path/to/example/template.html' },
      { id: 'age', key: 'age', label: 'Age', sort: 'number', filter: 'number' },
      { id: 'likes', key: 'likes', label: 'likes', ngFilter: 'commaGroups' },
      { id: 'height', key: 'height', label: 'Height', format: inches2feet, filter: feet_filter, sort: 'number' },
      { id: 'weight', key: 'weight', label: 'Weight', filter: 'number', sort: 'number' },
      { id: 'duration', key: 'duration', label: 'Duration', filter: 'duration', sort: 'number', template: '{{ row[column.key] | duration }}' },
      { id: 'memory', key: 'memory', label: 'Memory', filter: 'memory', sort: 'number', template: '{{ row[column.key] | memory }}' }
    ];

    // Table data
    $scope.my_table_data = [];

    // Selected rows
    $scope.my_selected_rows = [];

    // table options
    var dataDfd = $q.defer();
    $scope.my_table_options = {
      rowLimit: 10,
      highlightRow: function(row) {
        return (row.weight > 200 || row.weight < 100);
      },
      bodyHeight: 400,
      storage: localStorage,
      storageKey: 'gh-page-table',
      storageHash: 'a9s8df9a8s7df98as7dh',
      // getter: function(key, row) {
      //   return row[key];
      // },
      loading: true,
      loadingPromise: dataDfd.promise
    };

    $scope.my_table_data = genRows(1000);

    $scope.autoRefresh = false;
    $scope.autoAppend = false;

    // kick off interval that updates the dataset
    setInterval(function() {
      if ($scope.autoRefresh) {
        $scope.my_table_data.length = 0;
        $scope.my_table_data.push.apply($scope.my_table_data, genRows(1000));
        dataDfd.resolve();
        $scope.$apply();
      }
      else if ($scope.autoAppend) {
        $scope.my_table_data.push.apply($scope.my_table_data, genRows(1000));
        dataDfd.resolve();
        $scope.$apply();
      }
    }, 2000);

    $scope.removeHalf = function() {
      $scope.my_table_data.length = Math.ceil($scope.my_table_data.length / 2);
    };
  });
