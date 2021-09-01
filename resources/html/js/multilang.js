/**
 * Эта часть отвечает за перевод кешированных JSON
 * В фреймворке не используется, но для лампы нужна для переводов списка эффектов
 * Применяется после вызова deepfetch()
 */
lang = (function init_lang() {
var BODY = document.body,
//тело документа
LANG_HASH = {},
//собственно, результирующий хэш
LANG_HASH_LIST = [],
//список загружаемых словарей
LANG_HASH_INDEX = {},
//список имён словарей
LANG_HASH_USER = {},
//пользовательский словарь
LANG_HASH_SYSTEM = {},
//системный словарь
LANG_QUEUE_TO_UPDATE = [],
//очередь элементов для обновления
LANG_PROPS_TO_UPDATE = {},
//перечень имён для обновления
LANG_UPDATE_LAST = -1,
//индекс последнего обновлённого элемента
LANG_UPDATE_INTERVAL = 0,
//интервал обновления
LANG_JUST_DELETE = false; //неперестраивание хэша при удалении словаря
var hash_rebuild = function hash_rebuild() { //функция перестраивания хэша
    var obj = {};
    obj = lang_mixer(obj, LANG_HASH_USER);
    for (var i = 0, l = LANG_HASH_LIST.length; i < l; i++)
    obj = lang_mixer(obj, LANG_HASH_LIST[i]);
    LANG_HASH = lang_mixer(obj, LANG_HASH_SYSTEM);
},
lang_mixer = function lang_mixer(obj1, obj2) { //функция расширения свойствами
    for (var k in obj2)
    obj1[k] = obj2[k];
    return obj1;
},
lang_update = function lang_update(data) { //функция, инициирующая обновление
    switch (typeof data) {
    default:
        return;
    case "string":
        LANG_PROPS_TO_UPDATE[data] = 1;
        break;
    case "object":
        lang_mixer(LANG_PROPS_TO_UPDATE, data);
    }
    LANG_UPDATE_LAST = 0;
    if (!LANG_UPDATE_INTERVAL) LANG_UPDATE_INTERVAL = setInterval(lang_update_processor, 100);
},
lang_update_processor = function lang_update_processor() { //функция обновления
    var date = new Date;
    for (var l = LANG_QUEUE_TO_UPDATE.length, c, k; LANG_UPDATE_LAST < l; LANG_UPDATE_LAST++) {
        c = LANG_QUEUE_TO_UPDATE[LANG_UPDATE_LAST];
        if(!c)
            continue;
        if (!c._lang || !(c.compareDocumentPosition(BODY) & 0x08)) {
            LANG_QUEUE_TO_UPDATE.splice(LANG_UPDATE_LAST, 1);
            LANG_UPDATE_LAST--;
            if (!LANG_QUEUE_TO_UPDATE.length) break;
            continue;
        }
        for (k in c._lang)
        if (k in LANG_PROPS_TO_UPDATE) lang_set(c, k, c._lang[k]);
        if (!(LANG_UPDATE_LAST % 10) && (new Date() - date > 50)) return;
    }
    LANG_PROPS_TO_UPDATE = {};
    clearInterval(LANG_UPDATE_INTERVAL);
    LANG_UPDATE_INTERVAL = 0;
},
lang_set = function lang_set(html, prop, params) { //установка атрибута элемента
    html[params[0]] = prop in LANG_HASH ? LANG_HASH[prop].replace(/%(\d+)/g, function rep(a, b) {
        return params[b] || "";
    }) : "#" + prop + (params.length > 1 ? "(" + params.slice(1).join(",") + ")" : "");
};

var LANG = function Language(htmlNode, varProps, arrParams) { //связывание элемента с ключами
    var k;
    if (typeof htmlNode != "object") return;
    if (typeof varProps != "object") {
        if (typeof varProps == "string") {
            k = {};
            k[varProps] = [htmlNode.nodeType == 1 ? "innerHTML" : "nodeValue"].
            concat(Array.isArray(arrParams) ? arrParams : [])
            varProps = k;
        } else return;
    }
    if (typeof htmlNode._lang != "object") htmlNode._lang = {};
    for (k in varProps) {
        if (!(Array.isArray(varProps[k]))) varProps[k] = [varProps[k]];
        htmlNode._lang[k] = varProps[k];
        lang_set(htmlNode, k, varProps[k]);
    }
    if (LANG_QUEUE_TO_UPDATE.indexOf(htmlNode) == -1) LANG_QUEUE_TO_UPDATE.push(htmlNode);
};
lang_mixer(LANG, {
get: function get(strProp) { //получение перевода из хэша
    return LANG_HASH[strProp] || ("#" + strProp);
},
set: function set(strProp, strValue, boolSystem) { //установка ключа в пользовательском
    //или системном словаре
    var obj = !boolSystem ? LANG_HASH_USER : LANG_HASH_SYSTEM;
    if (typeof strValue != "string" || !strValue) delete obj[strProp];
    else obj[strProp] = strValue;
    hash_rebuild();
    lang_update(strProp + "");
    return obj[strProp] || null;
},
load: function load(strName, objData) { //загрузка словаря(ей)
    switch (typeof strName) {
    default:
        return null;
    case "string":
        if (LANG_HASH_INDEX[strName]) {
            LANG_JUST_DELETE = true;
            LANG.unload(strName);
            LANG_JUST_DELETE = false;
        }
        LANG_HASH_LIST.push(objData);
        LANG_HASH_INDEX[strName] = objData;
        break;
    case "object":
        objData = {};
        for (var k in strName) {
            if (LANG_HASH_INDEX[k]) {
                LANG_JUST_DELETE = true;
                LANG.unload(k);
                LANG_JUST_DELETE = false;
            }
            LANG_HASH_LIST.push(strName[k]);
            LANG_HASH_INDEX[k] = strName[k];
            objData[k] = 1;
        }

    }
    hash_rebuild();
    lang_update(objData);
    return typeof strName == "string" ? objData : strName;
},
unload: function unload(strName) { //выгрузка словаря(ей)
    var obj, res = {}, i;
    if (!(Array.isArray(strName))) strName = [strName];
    if (!strName.length) return null;
    for (i = strName.length; i--;) {
        obj = LANG_HASH_INDEX[strName[i]];
        if (obj) {
            LANG_HASH_LIST.splice(LANG_HASH_LIST.indexOf(obj), 1);
            delete LANG_HASH_INDEX[strName[i]];
            res[strName[i]] = obj;
            if (LANG_JUST_DELETE) return;
        }
    }
    hash_rebuild();
    lang_update(obj);
    return strName.length == 1 ? res : obj;
},
params: function params(htmlElem, strKey, arrParams) {
    if (typeof htmlElem != "object" || !htmlElem._lang || !htmlElem._lang[strKey]) return false;
    htmlElem._lang[strKey] = htmlElem._lang[strKey].slice(0, 1).concat(Array.isArray(arrParams) ? arrParams : []);
    lang_set(htmlElem, strKey, htmlElem._lang[strKey]);
    return true;
}
});
return LANG;
})();

let oldGlossary = {};
function updateLang(){
    let
        words          = {},
        effMic         = [],
        numb = false;
    (function traverse(root){
        for (let el=root.firstChild; el; el=el.nextSibling){
            if (el.nodeType==3){
                if (el.textContent.match(/EFF_/)){
                    if (el.textContent.match(/. EFF_/)){
                        numb = true;
                        let idx = el.textContent.indexOf('.')
                        words[el.textContent.slice(idx+2, idx+9)]=el;
                        if (el.textContent.match(/🎙/))
                            effMic.push(el.textContent.slice(idx+2, idx+9));
                    }
                    else if(el.textContent.match(/🎙/)){
                        effMic.push(el.textContent.slice(0, 7));
                        words[el.textContent.slice(0, 7)]=el;
                    }
                    else {
                        words[el.textContent]=el;    
                    }
                }
                else
                    continue;
            }
            else
                if(el.childNodes.length)
                    arguments.callee(el);
        }
    })(document.documentElement);
    console.log("WORDS", words);

    httpRequestXload = new XMLHttpRequest();
    httpRequestXload.overrideMimeType('application/json');
    httpRequestXload.onload = (res)=>{
        console.log('--| response');
        // console.log(httpRequestXload.responseText);

        let
            obj      = httpRequestXload.responseText;
            let glossaryEff = {};
        switch (langs) {
            case "eng":
                glossaryEff = JSON.parse( obj ).english;
                break;

            case "rus":
                glossaryEff = JSON.parse( obj ).russian;
                break;
        }

        // console.log("MICC", effMic);
        
        let matchGlossary = {};
        let keyS = Object.keys(glossaryEff);
        if (numb){
            for (let k = 0; k < keyS.length; k++){
                for (let i = 4; i < 7; i++) {
                    if (keyS[k][i] !== "0"){
                        let newNum;
                        newNum = keyS[k].slice(i) + ". " + Object.values(glossaryEff)[k];
                        if (effMic.length) {
                            for (let z = 0; z < effMic.length; z++){
                                if (keyS[k] === effMic[z]){
                                    newNum = keyS[k].slice(i) + ". " + Object.values(glossaryEff)[k] + " 🎙";
                                    break;
                                }
                            }
                        }
                        matchGlossary[keyS[k]] = newNum;
                        break;
                    }
                }
                
            }
        }
        else if (effMic.length && !numb){
            for (let k = 0; k < keyS.length; k++){
                let newn;
                newn = Object.values(glossaryEff)[k];
                for (let z = 0; z < effMic.length; z++){
                    if (keyS[k] === effMic[z]){
                        newn = Object.values(glossaryEff)[k] + " 🎙";
                        break;
                    }
                }
                matchGlossary[keyS[k]] = newn;
            }
        }
        else {
            matchGlossary = glossaryEff;
        }


        // Эта часть может пригодиться для перевода по значению, а не по ключам
        // --| match glossaryEff
        // let matchGlossary = {};

        // Object.keys(words).forEach((v, i)=>{
        //     let
        //         wordsEl     = words[v],
        //         wordsTxt    = wordsEl.nodeValue,
        //         flagMatch   = false,
        //         translation = '';

            // Object.keys(glossaryEff).forEach((v, i)=>{
        //         let testKey = v;

        //         if(wordsTxt==testKey){
        //             flagMatch   = true;
        //             translation = glossaryEff[v];
        //         }
        //     });
            
        //     if(flagMatch){
        //         matchGlossary[v] = translation;
        //     } else {
        //         matchGlossary[v] = wordsTxt;
        //     }
        // });

        console.log(matchGlossary);
        lang.unload("def", oldGlossary);
        lang.load("def", matchGlossary);
        oldGlossary = matchGlossary;

        for(let key in words)
            lang(words[key],key);

    }

    httpRequestXload.open('GET', 'local/glossaryEff.json', true);
    httpRequestXload.send(null);
    }