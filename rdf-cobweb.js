var COBWEB = function () {
    "use strict";

    var control = {
            base : null,
            profiles : null,
            requirements : null,
            error: null,
            complete: null
        },
        data = null,
        profiles = {},
        store = N3.Store();

    var cleanURL = function(url) {
        console.log('Splitting URL', url);
        return url.split('#')[0];
    };

    var analyse_profile = function(profile) {
        //data.html(profile);
        data = profile;
        profile.requirements = [];
        control.complete.show();

        control.requirements.html("Profile: " + profile.label + "");
        control.requirements.append( "<br />" );

        var matches = store.find(profile.url, PROF.dimBinding, null);

        if(matches.length == 0) {
            control.requirements.append("--Specifies no required properties--");
        }

        for(var i = 0; i < matches.length; i++) {
            var match = matches[i];

            var details = Util.extractDimension(store, match.object);
            profile.requirements.push(details);
            console.log('Details', details);
            if(!details.collection)
                continue;

            var req = Util.getElement('div');
            var lab = Util.getElement('span', 'requirement');
            var content = Util.getElement('div', 'requirement-body');

            req.append(lab);
            req.append(content);

            lab.html(details.label);

            var container = COBWEB_SKOS.loadCollection(content, details.collection, details);
            details.contents = container;

            control.requirements.append(req);
        }
    };
    var analyse_profiles = function(graph, data) {
        var matches = store.find(null, A, PROF.Profile);
        control.profiles.html("Found " + matches.length + " new Profiles<br />");

        for(var i = 0; i < matches.length; i++) {
            var match = matches[i];

            var label = Util.getLabel(store, match.subject);

            var profile = {};
            profile.label = label;
            profile.url = match.subject;
            profile.requirements = [];

            profiles[profile.url] = profile;
            //console.log(match);
        }

        //Build display elements
        for (var id in profiles) {
            var profile = profiles[id];

            var span = $(document.createElement('div'));
            span.addClass('profile');
            span.html( profile.label );

            span.click( function() {
                var temp = profile;
                return function() { analyse_profile( temp ); };
            }() );

            control.profiles.append(span);
        }
    };
    var parse = function(data, graph, callback) {
      //$('#data').text(data);
      var cleaned = data.replace(/[^\x00-\x7F]/g, "");
      console.log("Parsing graph", graph);
      var parser = N3.Parser();
      parser.parse(cleaned,
        function (error, triple, prefixes) {
          if(error) console.error('ERROR', error);
          if (triple) {
            var cleaned = cleanURL(graph);
            //console.log(triple.subject, triple.predicate, triple.object, graph);
            store.addTriple(triple.subject, triple.predicate, triple.object, cleaned);
          }
          else {
            console.log("Completed parsing.", graph, prefixes);
            callback(graph, data);
          }
        });
    };

    var displayError = function (message) {
        control.error.click( function () { control.error.hide() } );
        control.error.html(message);
        control.error.show();
    };

    var constructSurveySpecs = function ( struct ) {
        var survey = {
            profiles : [{
                label : struct.label,
                url : struct.url
            }],
            requirements: []
        };

        for(var i = 0; i< struct.requirements.length; i++) {
            var requirement = struct.requirements[i];

            var specification = {
                id: requirement.url,
                label : requirement.label,
                meta : {
                    collection: requirement.collection,
                    range: requirement.range,
                    property: requirement.property,
                    inverseProperty: requirement.inverse
                },
                required: true,
                type: 'list',
                entries : []
            };

            for( var id in requirement.contents.current.collection ) {
                var item = requirement.contents.current.collection[id];
                specification.entries.push({
                    id: item.url,
                    label: item.label
                });
            }
            survey.requirements.push(specification);
        }

        return survey;
    };

    var buildControl = function (callback) {
        control.base.html(null);
        control.base.addClass('cobweb-assistant');
        //Load new profiles from here.
        var inputspan = Util.getElement('div', 'profile');
        var input = Util.getElement('input');
        var button = Util.getElement('button');
        button.html('Load Profiles');
        inputspan.append(input);
        inputspan.append(button);
        button.click(function() {
            var url = input.val();
            console.log('Loading additional profiles', url);
            getTurtle( url , analyse_profiles );
        });

        var profiles = Util.getElement('div','profiles');
        var requirements = Util.getElement('div','requirements');
        var error = Util.getElement('div','error');

        var complete = Util.getElement('button', 'complete');
        complete.html('Use selected profile');
        complete.hide();
        complete.click(function() {
            var survey = constructSurveySpecs(data);
            callback(survey);
        });

        control.profiles = profiles;
        control.requirements = requirements;
        control.error = error;

        control.base.append(inputspan);
        control.base.append($(document.createElement('hr')));
        control.base.append(profiles);
        control.base.append($(document.createElement('hr')));
        control.base.append(requirements);
        control.base.append($(document.createElement('hr')));
        control.base.append(complete);
        control.base.append(error);

        control.complete = complete;
    };

    var loadedResource = {};
    var getTurtle = function(url, callback) {
        console.log("Loading url "+ url);
        var cleaned = cleanURL(url);
        if( loadedResource[cleaned] ) {
            console.log('Loaded resource from cache', url);
            callback(url, loadedResource[cleaned]);
            return;
        }
        // if(cleaned == 'http://prophet.ucd.ie/ontology/cobweb/profiles/prof') {
        //     callback(url, null);
        //     return;
        // }

        $.ajax(url, {
            accepts: {
                turtle: 'text/turtle',
                n3: 'text/rdf+n3'
            },
            converters: {
                'text turtle': function(result) { return result; },
                'text n3': function(result) { return result; },
                'n3 turtle': function(result) { return result; }
            },
            beforeSend : function (xhr) { xhr.setRequestHeader("Accept","text/turtle, text/rdf+n3"); },
            // Don't actualy care about the format received.
            dataType: 'turtle',
            error: function(xhr, textStatus, errorThrown) {displayError("Error Fetching Resource '"+ url +"': "+ errorThrown)} ,
            success: function(data, textStatus, xhr) {
                loadedResource[cleaned] = data;
                console.log(xhr);
                parse(data, url, callback);
            }
        });
    };

    return {
        store : {
            find : function(subject, predicate, object, graph) {
                if(graph) {
                    var cleaned = cleanURL(graph)
                    return store.find(subject, predicate, object, cleaned);
                }
                else
                    return store.find(subject, predicate, object);
            },
            count : function(subject, predicate, object, graph) {
                if(graph) {
                    var cleaned = cleanURL(graph)
                    return store.count(subject, predicate, object, cleaned);
                }
                else
                    return store.count(subject, predicate, object);
            }
        },
        callback : null,
        smartAssistant : function (id, callback) {
            this.callback = callback;
            control.base = $(id);

            buildControl(callback);

            var profile = 'http://prophet.ucd.ie/ontology/cobweb/profiles/prof';
            getTurtle( profile , analyse_profiles );
            // parse( $('#embedded-turtle').text(),
            //     url,
            //     analyse_profiles );
        },
        getTurtle : getTurtle,
        cleanURL : cleanURL
    };
}();
