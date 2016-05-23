define({ "api": [
  {
    "type": "post",
    "url": "/exam/comment/:exam_id",
    "title": "Add comment for exam",
    "name": "PostExamComment",
    "group": "Exam",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>A valid JWT token (Bearer:)</p>"
          }
        ]
      }
    },
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "exam_id",
            "description": "<p>Exam ID</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "comment",
            "description": "<p>Comment Object added</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "api/controllers/exam.js",
    "groupTitle": "Exam"
  }
] });
