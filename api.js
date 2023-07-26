class ApiEndpoint {
    constructor(define_str) {
        var self = this
        self.define = define_str
        var pragments = []

        define_str.split("/").forEach(pragment => {
            var tmp_pragment = pragment.trim()
            if (tmp_pragment.length > 0) {
                if (tmp_pragment[0] == ":") {
                    pragments.push([true, tmp_pragment.substring(1)])
                } else {
                    pragments.push([false, tmp_pragment])
                }
            }
        });
        self.pragments = pragments
    }
    buildPath(indexes) {
        var path = ""
        this.pragments.forEach(pragment=>{
            if (pragment[0]) {
                path += "/" + indexes[pragment[1]]
            } else {
                path += "/" + pragment[1]
            }
        })
        return path
    }
}

class ApiForm {
    constructor (context, indexes){
        this.data = {}
        this.headers = {}
        this.params = {}
        this.method = "GET"
    }
    isValid() {
        return true
    }
}

class ApiResponse {

    constructor(xmlhttp) {
        
        this.statusCode = 5000
        this.response = null
        this.success = false 
        this.errorCode = 0 
        this.message = ""
        this.responseObject = null
        this.responseText = ""

        if (xmlhttp) {

            this.statusCode = xmlhttp.status

            if (xmlhttp.responseText != "") {
                this.responseText = xmlhttp.responseText
                try{
                    this.response = JSON.parse(xmlhttp.responseText)
                    if (this.response && typeof this.response.success !== 'undefined') {
                        this.success = this.response.success == true
                        if (typeof this.response.response !== 'undefined') {
                            this.responseObject = this.response.response
                        }
                        if (typeof this.response.error_code == 'number') {
                            this.errorCode = this.response.error_code
                        }
                        if (typeof this.response.message == 'string') {
                            this.message = this.response.message
                        }
                    }
                }catch(ex){
                    
                }
            }
        }
    }
}

class Api {

    constructor(endpoint, form_class){

        var self = this
        self.form_class = form_class

        if (endpoint instanceof ApiEndpoint) {

            self.endpoint = endpoint

        } else if (typeof endpoint == 'string') {

            self.endpoint = new ApiEndpoint(endpoint)

        } else {

            self.endpoint = new ApiEndpoint("/")
        }
    }

    request (domain, nct_context, indexes, callback){

        var self = this 
        var data = {}
        var method = "GET"

        var xmlhttp = new XMLHttpRequest();

        var path = domain + self.endpoint.buildPath(indexes)

        var is_process = true

        if ( typeof self.form_class !== 'undefined' ) {

            var form = new self.form_class(nct_context, indexes)
            method = form.method
            if (!form.isValid()) {
                is_process = false
            } else {

                if (typeof form.data !== 'undefined') {

                    data = form.data
                }

                
                if (form.params.length > 0) {
                    path += "?"
                    var i = 0
                    Object.keys(form.params).forEach(key=>{
                        if (i != 0) {
                            path += "&"
                        }
                        path += "key="+ form.params[key]
                        i++
                    })
                }   
            } 
        }

        if (!is_process) {

            var response = new ApiResponse(null)
            response.message = "Invalid form data"
            callback(response)
            return
        }
        xmlhttp.onload = function(){
            if (this.responseURL.endsWith(".html") ) {
                window.location.href = this.responseURL
            }
        }
        xmlhttp.onreadystatechange = function() {

            if (this.readyState == 4 ) {
                
                if (this.statusCode == 301) {

                    window.location.href = this.location
                    return
                }
                if (typeof callback === "function"){

                    var response = new ApiResponse(this)

                    callback(response)
                }
            }
        };
        try {

            xmlhttp.open(method, path, true);

        } catch(ex){
            if (typeof callback === "function"){
                callback(null)
            }
        }

        Object.keys(form.headers).forEach(key=>{

            xmlhttp.setRequestHeader(key, encodeURIComponent(form.headers[key]))
        })

        if (method != 'GET' ) {
            if (data instanceof FormData) {
                //xmlhttp.setRequestHeader("Content-Type", "multipart/form-data")
                xmlhttp.send(data)
            } else if (typeof data == 'object'){

                xmlhttp.send(JSON.stringify(data));
            } else {
                xmlhttp.send()
            }

        } else {

            xmlhttp.send()
        }
    }
}

class ApiManager {
        
    constructor(){
        this.api = {}
        this.url = ""
    }
    setURL(url){
        this.url = url
    }
    register (name, endpoint, form_class){

        var pragments = name.split(".")
        var object = this.api
        var last_object = this.api
        var last = ""
        for(var i = 0; i< pragments.length; i++) {

            var tmp_name = pragments[i].trim()
            if (tmp_name.length > 0) {

                last_object = object
                last = tmp_name

                if (typeof object[tmp_name] !== 'object') {

                    object[tmp_name] = {}
                }
                object = object[tmp_name]
            }
        }
        
        if (object !== this.api && last != "") {

            last_object[last] = new Api(endpoint, form_class)

        } else {

            console.log("cannot register", endpoint)
        }
    }
}

var apiManager = new ApiManager()

function buildContext (dom) {

    var ctx = {}

    var run = (node, fn) => {

        fn(node);

        node.childNodes.forEach((n)=>{
            
            run(n, fn)
        })
    }

    var runChildren = (node, fn)=> {

        node.childNodes.forEach((n)=>{

            run(n, fn)
        })
    }

    var findRole = (node)=>{

        if(typeof node.hasAttribute === 'function' && node.hasAttribute("role")){

            var role = node.getAttribute("role")

            if (typeof ctx[role] === 'undefined') {

                ctx[role] = node
            }
        }
    }
    runChildren(dom, findRole)
    return ctx
}

window.apiManager = apiManager
window.api = apiManager.api
window.ApiForm = ApiForm