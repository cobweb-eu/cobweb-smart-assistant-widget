'use strict';
//Exception to other cases. Shorthand for RDF:type
var A = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

var append = function (url) { return function(identifier) { return url + identifier }; };

var SKOS = append('http://www.w3.org/2004/02/skos/core#');
SKOS.Concept = SKOS('Concept');
SKOS.narrower = SKOS('narrower');
SKOS.broader = SKOS('broader');

var DCT = append('http://purl.org/dc/terms/');
DCT.subject = DCT('subject');

var RDFS = append('http://www.w3.org/2000/01/rdf-schema#');
RDFS.label = RDFS('label');
RDFS.range = RDFS('range');
RDFS.subClassOf = RDFS('subClassOf');

var PROF = append('http://resources.opengeospatial.org/def/ontology/prof/');
PROF.Profile = PROF('Profile');
PROF.dimBinding = PROF('dimBinding');

PROF.collectionProperty = PROF('collectionProperty');
PROF.inverseCollectionProperty = PROF('inverseCollectionProperty');
PROF.collection = PROF('collection');

PROF.specifiedBy = PROF('specifiedBy');
PROF.overrides = PROF('overrides');

var DBO = append('http://dbpedia.org/ontology/');
DBO.Plant = DBO('Plant');

var Util = {
        getProfileRequirements : function(store, profile) {
            var requirements = [];
            var matches = store.find(profile, PROF.dimBinding, null);

            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                var details = Util.extractDimension(store, match.object);
                requirements.push(details);
            }
            return requirements;
        },
        getParentProfile : function(store, profile) {
            var parents = [];
            var matches = store.find(profile, RDFS.subClassOf, null);
            for(var i = 0; i < matches.length; i++) {
                var label = Util.getLabel(store, matches[i].object);
                parents.push( label );
            }
            return parents;
        },
        extractDimension : function(store, dimension) {
            var label = Util.getLabel(store, dimension);
            var range = Util.getRange(store, dimension);
            if(range.length > 0)
                range = range[0];

            var collection = Util.getObject(store,dimension, PROF.collection);
            var prop = Util.getObject(store,dimension, PROF.collectionProperty);
            var inv = Util.getObject(store,dimension, PROF.inverseCollectionProperty);
            var overrides = Util.getObject(store, dimension, PROF.overrides);
            var profile = Util.getObject(store, dimension, PROF.specifiedBy);

            return {
                url: dimension,
                label : label,
                range : range,
                collection : collection,
                property : prop,
                inverse : inv
            };
        },
        getObject : function(store, subject, property) {
            var results = store.find(subject, property,null);
            console.log('getObject', results);
            if(results.length > 0)
                return results[0].object;
            return null;
        },
        remove : function(array, item) {
            //var index = array.indexOf(item);
            //array.splice(index, 1);
        },
        isType : function(url, type) {
            var count = COBWEB.store.count(url, A, type, url);
            console.log(url, A, type, count);
            return count > 0;
        },
        getCollection : function(url, config) {
            var collection = [];

            if(config.property) {
                var collect = COBWEB.store.find(url, config.property, null, null);
                for(var j=0; j<collect.length;j++)
                    collection.push(collect[j].object);
            }
            if(config.inverse) {
                var collect = COBWEB.store.find(null, config.inverse, url, null);
                for(var j=0; j<collect.length;j++)
                    collection.push(collect[j].subject);
            }

            console.log(config, collection);
            return collection;
        },
        getNarrower : function (graph) {
            var narrowerN = COBWEB.store.find(graph, SKOS.narrower, null , graph);
            var narrowerI = COBWEB.store.find(null , SKOS.broader , graph, graph);

            var names = ["Mike","Matt","Nancy","Adam","Jenny","Nancy","Carl"];
            var uniqueNames = [];
            $.each(names, function(i, el){
                if($.inArray(el, uniqueNames) === -1) uniqueNames.push(el);
            });

            var narrower = [];
            for(var narr = 0; narr < narrowerN.length; narr++) {
                var item = narrowerN[narr].object;
                if( $.inArray(item, narrower) === -1 ) narrower.push( item );
            }
            for(var narr = 0; narr < narrowerI.length; narr++) {
                var item = narrowerI[narr].subject;
                if( $.inArray(item, narrower) === -1 ) narrower.push( item );
            }
            return narrower;
        },
        getElement : function(type, cls) {
            var element = $(document.createElement(type));
            if(cls)
                element.addClass(cls);
            return element;
        },
        getLabel : function (store, subject) {
            var labels = store.find(subject, RDFS.label, null);
            console.log('Labels fetched', subject, labels);
            var fallback = subject;
            for(var i = 0; i < labels.length; i++) {
                var label = labels[i];
                var lang = N3.Util.getLiteralLanguage( label.object );
                var value = N3.Util.getLiteralValue(label.object);
                if( lang === 'en' )
                    return value;
                else if ( lang === '' )
                    fallback = value;
            }
            return fallback;
        },
        getRange : function (store, subject) {
            var ranges = store.find(subject, RDFS.range, null),
                response = [];
            for (var i = 0; i < ranges.length; i++) {
                response.push(ranges[i].object);
            }
            return response;
        },
};
