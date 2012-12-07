var geocoder = require('geocoder'), bobamo = require('bobamo'), mongoose = bobamo.mongoose;

var AddressSchema = new mongoose.Schema({
    name        : {type: String, default : ''},
    street1     : {type: String, default : ''},
    city        : {type: String, default : '', required: true},
    state       : {type: String, required : true},
    zip         : {type: String, default : ''},
    country     : {type: String},
    location    : {type:'GeoPoint', display:{type:'LocationEditor'}},
    type        : {type: String, enum:['agent', 'agency', 'registrant'], index:true},
    primary     : {type: Boolean, default: false},
    meta        : {
        favorite:Number,
        links:[
            {type:String}
        ],
        terms:[
            {
                label:{type:String},
                value:{type:Number}
            }
        ]
    }
});
var Address = mongoose.model('Address', AddressSchema);
var config = {};
var http_proxy = process.env['http_proxy'];
if (http_proxy){
    var re = /^http(s?):\/\//i;
    http_proxy = re.test(http_proxy) ? http_proxy : 'http://'+http_proxy;
    var url = require('url').parse(http_proxy );
    config.hostname = url.hostname;
    config.port = url.port;
    config.headers = {
        Host: 'maps.googleapis.com'
    }
    if (url.auth)
        config.headers["Proxy-Authorization"] = 'Basic ' + new Buffer(url.auth).toString('base64');

}
function join(delim){
   var ret = '';
    Array.prototype.slice.call(arguments, 1).forEach(function(v){
        if (v)
            ret +=delim+v;
    });
    return ret;
}
Address.prototype.geocode = function(next){
    var self = this;
    var schema = this.schema;
    var addr = join('+', this.street1, this.street2, this.city, this.state, this.zip);

    geocoder.geocode(addr, function(err, data){
        if (err) next();
        console.log('data',data);
        if (data){
        var rloc = data.results[0].geometry.location;
            self.location = {lng: rloc.lng, lat: rloc.lat};
            next(null, data);
        }
    })

};
AddressSchema.statics.search = function(q){
    // P.find({pos : { $near : [ 50, 20], $maxDistance: 30 }} , function(err, docs){
    console.log('searching', q);
    var near = q.near || {};
    return this.find({location:{ $near:[near.lon, near.lat], $maxDistance:q.maxDistance/111.2}});
};

AddressSchema.statics.search.display = {
    schema:{
        near:'LocationEditor',
        maxDistance:{
            type:'Select',
            options:[1,5,10,100]
        }
    },
    fieldsets:[{legend:'Near', fields:['near','maxDistance']}]
}
AddressSchema.pre('save', function(next){
    this.geocode(next);
});
module.exports = Address;