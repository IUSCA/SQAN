# dicom-qc

Quality Control service for Dicom prototype

# Reference

For VR (Value Representation) see chapter 6.2 of http://dicom.nema.org/dicom/2004/04_05pu.pdf

# TODO

Register private tags via OrthancPluginRegisterDictionaryTag

Hi Soichi,

> Q1)
>
>
> Does Orthanc store any private tags under "Unknown Tag & Data" exposed via /simplified-tags REST API?
>

Yes.
I.e, if you have 2 private tags in your file, via instances/:id/tags, you'll get somthing like:

   "8889,8887" : {
      "Name" : "Unknown Tag & Data",
      "Type" : "Null",
      "Value" : null
   },
   "8889,8889" : {
      "Name" : "Unknown Tag & Data",
      "Type" : "Null",
      "Value" : null
   }

but, through instances/:id/tags?simplify, you'll just get:
   "Unknown Tag & Data" : null

However, you may access their value through instances/:id/content/8889,8889 and instances/:id/content/8889,8887

>
>
> Q2) 
>
>
> My collaborator is planning to send us images to our Orthanc instance that contains various private tags. I need those private tags to pass through Orthanc and receive them via /simplified-tags REST API. Do I need to *register* those private tags somewhere in the Orthanc configuration files in order for them to appear on the JSON? If so, how can I do that?

I think you could do this only via a plugin by calling OrthancPluginRegisterDictionaryTag

Apply IIBISID based access control (what should I do with kibana?)

Saw strange cb issue on qc

qc-13 Thu Oct 29 2015 04:23:30 GMT+0000 (UTC) - info: QC-ing 56319f42266a1fa47c65e650
qc-13 Error: Callback was already called.
    at /usr/local/git/dicom/node_modules/async/lib/async.js:35:31
    at Query.callback (/usr/local/git/dicom/node_modules/mongoose/lib/query.js:2009:7)
    at /usr/local/git/dicom/node_modules/mongoose/node_modules/kareem/index.js:177:19
    at /usr/local/git/dicom/node_modules/mongoose/node_modules/kareem/index.js:109:16
    at process._tickDomainCallback (node.js:486:13)

