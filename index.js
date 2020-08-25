
var onem2mClient = require("onem2m_client")();

var fs = require('fs');
var path = require('path');
var Uuid = require('uuid');
var Http = require('request-promise');





// var FC_NAME         = "LTE_Tester_02";
var FC_NAME         = "20170717074825768bp2l";
var FILE_DUMP_PATH  = "dump";




var MOBIUS_ADDRESS = "http://203.253.128.161:7579/Mobius/";
var GCS_NAME        = "office2017"; //ae

var CNT_MISSION_DATA    = "pir_filab_01"; //cnt
// var CNT_MISSION_LTE     = "LTE"; //cnt

var DUMP_FILE_PREFIX    = "sensors";

var CIN_PAGING_UNIT     = 500; //  cin을 n개 단위로 조회


function dumpFileName() {
  var date = new Date();
  var y = padding(date.getFullYear(), 4);
  var m = padding(date.getMonth()+1, 2);
  var d = padding(date.getDate(), 2);
  var h = padding(date.getHours(), 2);
  var min = padding(date.getMinutes(), 2);
  var s = padding(date.getSeconds(), 2);
 
  // return DUMP_FILE_PREFIX+"-"+y+m+d+"-"+h+min+s + '.csv';
  return DUMP_FILE_PREFIX+"-"+"pir01"+'.csv';
}



// var LTE_DATA_FIELD_NAMES = [
//     'time_boot_ms',
//     'band',
//     'earfcn',
//     'bandwidth',
//     'pci',
//     'cell_id',
//     'guti',
//     'tac',
//     'rsrp',
//     'rsrq',
//     'rssi',
//     'sinr',
//     'lat',
//     'lon',
//     'alt',
//     'relative_alt'
// ];

var LTE_DATA_FIELD_NAMES = [
  'pi',
  'ri',
  'ty',
  'ct',
  'st',
  'rn',
  'lt',
  'et',
  'cs',
  'cr',
  'con'
];


function DiscoverChildInstance(resourceUrl, origin, type, offset, limit) {

    // origin = 'SOrigin';
    origin = 'S20170717074825768bp2l';

    return new Promise(function(resolved, rejected) {

      var needGetCin = false;
      var filterCriteria = '?rcn=4&lvl=1&cra=20200811';
      if( type ){
        if(type instanceof Array){
          type.forEach((ty)=> {
            filterCriteria += '&ty=' + ty;
          })
        }else{
          filterCriteria += '&ty=' + type;
        }
      }
      filterCriteria += ('&lim=' + limit);
      filterCriteria += ('&ofst=' + offset);

      console.log( resourceUrl + filterCriteria );

      var options = {
        method: 'GET',
        uri: resourceUrl + filterCriteria,
        headers: {
          "Accept": "application/json",
          "nmtype": "short",
          "X-M2M-RI": "1234er5",
          "X-M2M-Origin": origin
        },
        json: true
      };

      Http(options)
        .then(function(result) {
          resolved(result);
          // console.log(result);
        })
        .catch(function(error) {
          rejected(error);
        });
    });
  }





function padding(n, l) {
    var result = '000000000000000' + n;
    return result.substring(result.length - l);
}







var DUMP_FILE_NAME = path.join(FILE_DUMP_PATH, dumpFileName());
console.log( DUMP_FILE_NAME);

fs.appendFileSync(DUMP_FILE_NAME, LTE_DATA_FIELD_NAMES.join(',') + '\n');


// var LTE_DATA_CONTAINER_URL = MOBIUS_ADDRESS + GCS_NAME + "/" + CNT_MISSION_DATA + "/" + FC_NAME + "/" + CNT_MISSION_LTE;
var LTE_DATA_CONTAINER_URL = MOBIUS_ADDRESS + GCS_NAME + "/" + CNT_MISSION_DATA;
var origin = "S" + FC_NAME;

onem2mClient.Http.getResource(LTE_DATA_CONTAINER_URL, origin)
.then(function(cnt){

    var pagingInfo = [];
    if(cnt && cnt['m2m:cnt']) {
        var numberOfCin = cnt["m2m:cnt"].cni;

        var numberOfPages = parseInt(numberOfCin / CIN_PAGING_UNIT);
        var remains = numberOfCin % CIN_PAGING_UNIT;

        pagingInfo = new Array(numberOfPages).fill(CIN_PAGING_UNIT)
        pagingInfo.push(remains);

        return pagingInfo;
    }
    else {
        return [];
    }
    
})

.then(function(pagingInfo){

    return Promise.all(pagingInfo.map(function(item, index){
        return DiscoverChildInstance(LTE_DATA_CONTAINER_URL, origin, "4", index * CIN_PAGING_UNIT, item);
    }));

})

.then(function(result){

    for(var p=0; p < result.length; p++) {

        var cinList = result[p]['m2m:rsp']['m2m:cin'];

        var len = cinList.length;
        for(var i=0; i < len; i ++) {
            var cin = cinList[i];
            if(cin && cin.con && cin.con) {
                gpi = cin; //GLOBAL: data object -> con으로
                // console.log(cin);
    
                var dataLine = [];
                LTE_DATA_FIELD_NAMES.map(function(key, index){
                    dataLine.push( gpi[key] );
                });
                dataLine.push( cin.ri );

                fs.appendFileSync(DUMP_FILE_NAME, dataLine.join(',')+ '\n');
            }
        }
    
    }


})

.catch(function(err){
    console.log( "ERROR", err);
});




