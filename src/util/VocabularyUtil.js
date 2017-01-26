
'use strict'

import N3 from 'n3';

const VocabularyUtil = {

    store : N3.Store(),

    prefixes : {
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        owl: "http://www.w3.org/2002/07/owl#"
    },

    importPredicate : "http://www.w3.org/2002/07/owl#imports",

    getVocabulary : function(vocabularyURL, callback) {
        VocabularyUtil.addVocabulary(vocabularyURL, function(error) {
            if (error) {
                callback(error);
            }
            callback(null);
        });
    },

    addVocabulary : function(vocabularyURL, callback) {
        VocabularyUtil.getVocabularyData(vocabularyURL, function(error, data) {
            if (error)
                callback(error);

            VocabularyUtil.parseVocabularyData(data, function(error, importURLs) {
                if (error)
                    callback(error);

                if (importURLs.length > 0) {
                    importURLs.forEach(function(importURL, index) {
                        VocabularyUtil.addVocabulary(importURL, function(error) {
                            if (error)
                                callback(error);

                            if (index === importURLs.length - 1)
                                callback(null);
                        });
                    });
                } else {
                    callback(null);
                }
            });
        });
    },

    getVocabularyData : function(vocabularyURL, callback) {
        fetch(vocabularyURL, {
            method: "GET",
            mode: "cors"
        }).then(function(response) {
            return response.text();
        }).then(function(data) {
            callback(null, data);
        }).catch(function(error) {
            callback(error, null);
        });

    },

    parseVocabularyData : function(data, callback) {
        let parser = N3.Parser();
        var importURLs = [];
        parser.parse(data, function(error, triple, prefixes) {
            if (error) {
                callback(error, null);
            }

            if (triple) {
                VocabularyUtil.store.addTriple(triple.subject, triple.predicate, triple.object);
                if (triple.predicate === VocabularyUtil.importPredicate) {
                    importURLs.push(triple.object);
                }
            }
            else {
                //console.log("# That's all, folks!")
                callback(null, importURLs);
            }
        });
    },

    listAnnotatableThings : function() {
        let rootLabel = '"AnnotatableThing"';
        let rootObject = VocabularyUtil.getLabelClass(rootLabel);
        let annotatableThings = VocabularyUtil.getSubClasses(rootObject);
        return VocabularyUtil.toStrings(annotatableThings);
    },

    toString : function(literal) {
        return literal.replace(/['"]/g, "");
    },

    toStrings : function(literals) {
        return literals.map(function(literal) {
            return VocabularyUtil.toString(literal);
        });
    },

    getLabelClass : function(typeLabel) {
        let triples = VocabularyUtil.store.find(null, VocabularyUtil.expand('rdfs:label'), N3.Util.createLiteral(typeLabel));
        return triples[0] ? triples[0].subject : null;
    },

    getClassLabel : function(className) {
        let triples = VocabularyUtil.store.find(className, VocabularyUtil.expand('rdfs:label'), null);
        return triples[0] ? triples[0].object : null;
    },

    getSubClasses : function(className) {
        let triples = VocabularyUtil.store.find(null, VocabularyUtil.expand('rdfs:subClassOf'), className);
        return triples.map(function(triple) {
            return VocabularyUtil.getClassLabel(triple.subject);
        });
    },

    getSuperClass : function(className) {
        let triples = VocabularyUtil.store.find(className, VocabularyUtil.expand('rdfs:subClassOf'), null);
        return triples[0] ? triples[0].subject : null;
    },

    expand : function(prefixedName) {
        let prefix = prefixedName.split(":")[0];
        let name = prefixedName.split(":")[1];
        return VocabularyUtil.prefixes[prefix] + name;
    }
}

export default VocabularyUtil;
