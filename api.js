class ApiEndpoint 
{
    constructor(define_str) 
    {
        var self = this
        self.define = define_str
        var pragments = []

        define_str.split("/").forEach(pragment => {
            var tmp_pragment = pragment.trim()
            if (tmp_pragment.length > 0) 
            {
                if (tmp_pragment[0] == ":") 
                {
                    pragments.push([true, tmp_pragment.substring(1)])
                } 
                else 
                {
                    pragments.push([false, tmp_pragment])
                }
            }
        });
        self.pragments = pragments
    }
    buildPath(indexes) 
    {
        var path = ""
        this.pragments.forEach(pragment=>{
            if (pragment[0]) 
            {
                path += "/" + indexes[pragment[1]]
            } 
            else 
            {
                path += "/" + pragment[1]
            }
        })
        return path
    }
}

class ApiEncoding 
{
    constructor(encoder_func, decoder_func, encoding_headers, decoding_headers)
    {
        this.encoder = encoder_func;
        this.decoder = decoder_func;
        this.encodingHeaders = {}; //inject to request header
        this.decodingHeaders = {}; //inject to request header
        if(typeof encoding_headers == 'object' && encoding_headers != null)
        {
            this.encodingHeaders = encoding_headers;
        }
        if(typeof decoding_headers == 'object' && decoding_headers != null)
        {
            this.decodingHeaders = decoding_headers;
        }
    }
}

class ApiForm 
{
    constructor (context, indexes)
    {
        this.data = {}
        this.headers = {}
        this.params = {}
        this.method = "GET"
    }
    isValid() 
    {
        return true
    }
}

class ApiResponse 
{
    constructor(xmlhttp, decoder_func) 
    {       
        this.statusCode = 5000
        this.response = null
        this.success = false 
        this.errorCode = 0 
        this.message = ""
        this.responseObject = null
        this.responseText = ""

        if (xmlhttp) 
        {
            this.statusCode = xmlhttp.status
            this.responseText = "";
            if(typeof decoder_func == 'function')
            {
                if (xmlhttp.response) 
                {
                    const byte_array = new Uint8Array(xmlhttp.response);
                    this.response = decoder_func(byte_array);
                    this.responseText = JSON.stringify(byte_array);
                } 
                else 
                {
                    throw "custom decoding is only supporting for binary data"
                }
            }
            else 
            {
                this.responseText = xmlhttp.responseText
                this.response = JSON.parse(this.responseText)
            }

            
            if (this.response && typeof this.response.success !== 'undefined') 
            {
                this.success = this.response.success == true
                if (typeof this.response.response !== 'undefined') 
                {
                    this.responseObject = this.response.response
                }
                if (typeof this.response.error_code == 'number') 
                {
                    this.errorCode = this.response.error_code
                }
                if (typeof this.response.message == 'string') 
                {
                    this.message = this.response.message
                }
            }
        }
    }
}

class Api 
{
    constructor(endpoint, form_class, opts)
    {
        const self = this
        this.form_class = form_class
        this.parent = null;

        if (endpoint instanceof ApiEndpoint) 
        {
            this.endpoint = endpoint
        } 
        else if (typeof endpoint == 'string') 
        {
            this.endpoint = new ApiEndpoint(endpoint)
        } 
        else 
        {
            this.endpoint = new ApiEndpoint("/")
        }

        this.encodingMethod = 'json';
        this.decodingMethod = 'json';

        if(typeof opts !== 'undefined' && opts)
        {
            if(typeof opts.encoding_method == 'string')
            {
                this.encodingMethod = opts.encoding_method;
            }
            if(typeof opts.decoding_method == "string")
            {
                this.decodingMethod = opts.decoding_method;
            }
        }
    }

    request (domain, nct_context, indexes, callback)
    {
        let self = this 
        var data = {}
        var method = "GET"
        var path = domain + self.endpoint.buildPath(indexes)
        var is_process = true

        if ( typeof self.form_class !== 'undefined' ) 
        {
            var form = new self.form_class(nct_context, indexes)
            method = form.method
            if (!form.isValid()) 
            {
                is_process = false
            } 
            else 
            {
                if (typeof form.data !== 'undefined') 
                {
                    data = form.data
                }

                if (form.params.length > 0) 
                {
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

        if (!is_process) 
        {
            var response = new ApiResponse(null)
            response.message = "Invalid form data"
            callback(response)
            return
        }

        var xmlhttp = new XMLHttpRequest();
        var decoder_func = JSON.parse;
        var encoder_func = JSON.stringify;
        var alter_headers = {}; //consider move this to constructor

        if(typeof this.encodingMethod == 'string' && this.encodingMethod != 'json')
        {
            if(this.parent != null && typeof this.parent.encodings[this.encodingMethod].decoder == 'function')
            {
                let encoding = this.parent.encodings[this.encodingMethod];
                encoder_func = encoding.encoder;
                console.log(encoder_func);
                Object.keys(encoding.encodingHeaders).forEach(key=>{
                    
                    alter_headers[key] = encoding.encodingHeaders[key];
                })
            }
            else 
            {
                throw "decoder function is not found";
            }
        }
        if(typeof this.decodingMethod == 'string' && this.decodingMethod != 'json')
        {
            if(this.parent != null && typeof this.parent.encodings[this.decodingMethod].decoder == 'function')
            {
                let encoding = this.parent.encodings[this.decodingMethod];
                decoder_func = encoding.decoder;
                xmlhttp.responseType = "arraybuffer"; //TODO: consider using content-type for decoding
                Object.keys(encoding.decodingHeaders).forEach(key=>{
                    alter_headers[key] = encoding.decodingHeaders[key];
                })
            }
            else 
            {
                throw "decoder function is not found";
            }
        }

        xmlhttp.onload = function()
        {
            if (this.responseURL.endsWith(".html") ) 
            {
                window.location.href = this.responseURL
            }
        }
        xmlhttp.onreadystatechange = function() 
        {
            if (this.readyState == 4 ) 
            {    
                if (this.statusCode == 301) 
                {
                    window.location.href = this.location
                    return
                }
                if (typeof callback === "function")
                {
                    const response = new ApiResponse(this, decoder_func);
                    callback(response)
                }
            }
        };
        try 
        {
            xmlhttp.open(method, path, true);
        } 
        catch(ex)
        {
            if (typeof callback === "function")
            {
                callback(null)
            }
        }

        Object.keys(form.headers).forEach(key=>{

            xmlhttp.setRequestHeader(key, form.headers[key])
        })

        Object.keys(alter_headers).forEach(key=>{

            xmlhttp.setRequestHeader(key, alter_headers[key])
        })

        if (method != 'GET' ) 
        {
            if (data instanceof FormData) 
            {
                //xmlhttp.setRequestHeader("Content-Type", "multipart/form-data")
                xmlhttp.send(data)
            } 
            else if (typeof data == 'object')
            {
                xmlhttp.send(encoder_func(data));
            } 
            else 
            {
                xmlhttp.send()
            }
        }
        else
        {
            xmlhttp.send()
        }
    }
}


class ApiManager 
{        
    constructor()
    {
        this.api = {}
        this.url = ""
        this.encodings = {};
    }
    registerEncoder(name, api_encoding)
    {
        if(typeof name == 'string' && name.length > 0 && api_encoding instanceof ApiEncoding)
        {
            this.encodings[name] = api_encoding;
        }
        else 
        {
            throw "invalid parameter";
        }
    }
    setURL(url)
    {
        this.url = url
    }
    register (name, endpoint, form_class, opts)
    {
        var pragments = name.split(".")
        var object = this.api
        var last_object = this.api
        var last = ""
        for(var i = 0; i< pragments.length; i++) 
        {
            var tmp_name = pragments[i].trim()
            if (tmp_name.length > 0) 
            {
                last_object = object
                last = tmp_name

                if (typeof object[tmp_name] !== 'object') 
                {
                    object[tmp_name] = {}
                }
                object = object[tmp_name]
            }
        }
        
        if (object !== this.api && last != "") 
        {
            let new_api = new Api(endpoint, form_class, opts)
            new_api.parent = this;
            last_object[last] = new_api;
        } 
        else 
        {
            console.log("cannot register", endpoint)
        }
    }
}

var apiManager = new ApiManager()

function buildContext (dom) 
{
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

        if(typeof node.hasAttribute === 'function' && node.hasAttribute("role"))
        {

            var role = node.getAttribute("role")

            if (typeof ctx[role] === 'undefined') 
            {
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