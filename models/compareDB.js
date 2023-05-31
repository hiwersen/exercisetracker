db.getCollectionNames().forEach(function(collectionName) {
    var countOld = db.getSiblingDB('execiseTracker')[collectionName].countDocuments();
    var countNew = db.getSiblingDB('exerciseTracker')[collectionName].countDocuments();
    
    print(`For collection ${collectionName}: execiseTracker has ${countOld} docs, exerciseTracker has ${countNew} docs`);
});

    