var COBWEB_SKOS = function () {
    "use strict";

    var loadCollection = function (control_object, collection, settings, previous) {
        var object = previous;
        if( !object ) {
            console.log('Creating SKOS history');
            object = {
                current : null,
                stack : [],
                getCollection : function () {
                    return current.collection;
                }
            };
        }
        if(object.current) {
            console.log('Stacking SKOS history');
            object.stack.push(object.current);
        }

        var skos_content = control_object;

        var handleCollection = function(graph, data) {
            var content = Util.getElement('div');

            object.current = {};
            object.current.url = graph;
            object.current.label = Util.getLabel(COBWEB.store, graph);
            object.current.narrower = [];
            object.current.content = content;
            object.current.collection = {};

            var narrower = Util.getNarrower(graph);

            var title = Util.getElement('div', 'skos-title');
            title.html(object.current.label);
            var narrowerBits = Util.getElement('div', 'narrower-group');
            var collectionBits = Util.getElement('div', 'collection-bits');

            // Load narrower type.
            for(var narr = 0; narr < narrower.length; narr++) {
                (function() {
                    var narrow = narrower[narr];
                    var element = Util.getElement('div', 'narrower');

                    element.html(narrow);
                    element.click(function() {
                        log.html(narrow);
                        console.log('Narrowing down collection', narrow);
                        loadCollection(skos_content, narrow, settings, object);
                    });

                    var updateLabel = function(graph, data) {
                        var label = Util.getLabel(COBWEB.store, narrow);
                        element.html(label);
                    };

                    COBWEB.getTurtle(narrow, updateLabel);
                    narrowerBits.append(element);
                })();
            }

            var refine = Util.getElement('button');
            var hideRefine = function() {
                refine.html("Refine");
                narrowerBits.hide();
                refine.click(showRefine);
            };
            var showRefine = function() {
                refine.html("Hide");
                narrowerBits.show();
                refine.click(hideRefine);
            };
            hideRefine();
            narrowerBits.hide();

            // Load labels of actual values. - identified by
            if(settings) {
                var collection = Util.getCollection(graph, settings);
                for(var j = 0; j< collection.length; j++) {
                    (function() {
                        var item = {};
                        var display = Util.getElement('div','item');

                        item.url = collection[j];
                        item.type = settings.range;
                        object.current.collection[item.url] = item;

                        var updateLabel = function() {
                            var isType = Util.isType(item.url, item.type);
                            if( !isType ) {
                                console.log('Removing item from list', item.url);
                                delete object.current.collection[item.url];
                                display.remove();
                                return;
                            }

                            item.label = Util.getLabel(COBWEB.store, item.url);
                            display.html(item.label);
                        };

                        var label = Util.getLabel(COBWEB.store, item.url);
                        if( label === item.url ) {
                            COBWEB.getTurtle(item.url, updateLabel);
                            display.html(item.url);
                        } else {
                            item.label = label;
                            display.html(item.label);
                        }

                        collectionBits.append(display);
                    })();
                }
            }

            content.append(title);
            console.log('Evaluating history', object.stack);

            if( object.stack.length > 0 ) {
                console.log('Creating SKOS back button')
                var control = Util.getElement('button');
                control.html('Back Up Category');
                control.click(function() {
                    var previous = object.stack.pop();
                    control.attr('enabled', false);
                    control.html('Loading');
                    console.log('Reverting SKOS', previous);
                    object.current = null;
                    loadCollection(skos_content, previous.url, settings, object);
                    //object.current = previous;
                    //skos_content.html(previous.content);
                });

                title.append( control );
            }
            if(narrower.length > 0) {
                title.append(refine);
                content.append(narrowerBits);
            }
            content.append(collectionBits);
            skos_content.html(content);
        };


        COBWEB.getTurtle(collection, handleCollection);

        return object;
    };

    return {
        loadCollection : function(control_object, collection, settings) {
            return loadCollection(control_object, collection, settings);
        }
    };
}();
