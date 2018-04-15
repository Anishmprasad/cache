import { api } from './api'

class SessionResponseCache {
    constructor() {
        this.searchResponseTrie = new ResponseTrie()
        this.wikiResponseTrie = new ResponseTrie()
        this.typeaheadSearchResponse = new ResponseTrie()
    }
    getTypeaheadSearchResponse(query, cid, index) {
        return this.typeaheadSearchResponse.get([query, cid, index])
    }
    addTypeaheadSearchResponse(query, cid, index, data) {
        this.typeaheadSearchResponse.addData([query, cid, index], data)
    }
    fetchTypeaheadSearchResponse(query, cid, index) {
        return new Promise((resolve, reject) => {
            var cacheData = sessionResponseCache.getTypeaheadSearchResponse(query, cid, index)
            if (cacheData != null) {
                resolve(cacheData)
            }
            else {
                reject({ status: 'fail', message: "doesn't exist in cache" })
            }
        })
    }
    getSearchResponse(query, goal, exams, pageNo) {
        return this.searchResponseTrie.get([query, goal, exams, pageNo])
    }
    addSearchResponse(query, goal, exams, pageNo, data) {
        this.searchResponseTrie.addData([query, goal, exams, pageNo], data)
        //console.log(this.searchResponseTrie)
    }
    getWikiResponse(query) {
        return this.wikiResponseTrie.get([query])
    }
    addWikiResponse(query, data) {
        this.wikiResponseTrie.addData([query], data)
    }
}
class ResponseTrie {
    constructor() {
        this.root = new TrieNode('root')
    }
    get(query_parts) {
        const node = this.getFromTrie(this.root, Object.assign([], query_parts), false)
        if (node != null) {
            return node.data
        }
        return null
    }
    getFromTrie(root, query_parts, add) {
        if (query_parts.length > 0) {
            const root_query = query_parts.splice(0, 1)[0]
            const node = root.getNode(root_query)
            if (node != null) {
                return this.getFromTrie(node, query_parts, add)
            }
            else if (add) {
                return root
            }
            return null
        }
        return root
    }
    addData(query_parts, data) {
        const modified_query = Object.assign([], query_parts)
        var root = this.getFromTrie(this.root, modified_query, true)
        for (var i = (query_parts.length - modified_query.length) - 1; i < query_parts.length; i++) {
            const newNode = new TrieNode(query_parts[i])
            root.nodes.push(newNode)
            root = newNode
        }
        root.setData(data)
    }
}
class TrieNode {
    constructor(label) {
        this.label = label
        this.nodes = []
    }
    getNode(label) {
        if (this.nodes.length > 0) {
            return this.binarySearch(label)
        }
        return null
    }
    binarySearch(label) {
        var nodes = Object.assign([], this.nodes)
        nodes = nodes.sort((next, curr) => curr.label < next.label)
        const index = this.search(nodes, label, 0, nodes.length - 1)
        if (index < 0) {
            return null
        }
        return nodes[index]
    }
    search(nodes, label, l, h) {
        var m = Math.floor((l + h) / 2)
        if (nodes[m].label == label) {
            return m
        }
        if (l == h) {
            return -1
        }
        else if (nodes[m].label > label) {
            return this.search(nodes, label, l, m)
        }
        return this.search(nodes, label, m + 1, h)
    }
    addNode(label) {
        this.nodes.push(label)
    }
    setData(data) {
        this.data = data
    }
}
export const sessionResponseCache = new SessionResponseCache()

export const fetchNextPage = (query, goal_code, content_type, content_code, exam, start, size = 10) => {
    if (sessionResponseCache.getSearchResponse(query, goal_code, exam, (start / 10) + 1) != null) {
        return
    }
    const params = { query, content_type, content_code, exam, start, size }
    if (goal_code != "none") {
        params.goal_code = goal_code
    }
    var exam_code = (exam != -1) ? exam : null
    const apiurl = '/global_search'
    horizontal_api().get(apiurl, {
        params
    }).then((response) => {
        if (response && response.data && response.data.success == true) {
            var total_pages = Math.ceil((response.data.count_all_widgets || 0) / 10);
            var results = []
            if (response.data.results) {
                results = response.data.results
            }
            sessionResponseCache.addSearchResponse(query, goal_code, exam, (start / 10) + 1, { response })
        }
    })

}



















return sessionResponseCache.fetchTypeaheadSearchResponse(search_query, cid_entry, idx_entry).then((cacheData) => {
    doOnSearchResult(dispatch, cacheData.response)
    dispatch(set_loader_status(false));
    dispatch(disambiguation(response.data.disambiguation.is_disambiguated))
    console.log('search query from cache - ', search_query);
    return cacheData.response
}).catch((err) => {
    dispatch(searchHints([]));
    if (parent != 'LearnResults') {
        dispatch(set_loader_status(true));
    }
    dispatch(setPageNo(0));
    console.log('search query not from cache - ', search_query);
    return horizontal_api().get(apiurl, {
        cancelToken: source.token,
        params: {
            query: search_query,
            // goal_code: goal,
            content_type: idx,
            // exam_id:exam_id,
            content_code: cid,
            start: 0,
            size: 10
        }
    }).then(response => {
        if (response.data.success) {
            dispatch(disambiguation(response.data.disambiguation.is_disambiguated))
        }
        if (response.data.results || response.data.count_overall == 0 || (response.data.dym && response.data.dym.valid) || window.location.pathname === '/search')
            dispatch(set_loader_status(false))
        if (response.data.success == true) {
            doOnSearchResult(dispatch, response)
            sessionResponseCache.addTypeaheadSearchResponse(search_query, cid_entry, idx_entry, { response })
            if (response.data.valid_goals && response.data.valid_goals.length == 1) {
                goal_id = response.data.valid_goals[0]
            }
            sessionResponseCache.addSearchResponse(search_query, goal_id, -1, 1, { response })
            var total_pages = Math.ceil((response.data.count_all_widgets || 0) / 10);
            if (total_pages > 1) {
                fetchNextPage(search_query, goal_id, idx, cid, -1, 10)
            }

            if (response.data.disambiguation.is_disambiguated && response.data.disambiguation.autofill) {
                //console.log('Activity Write - Search',search_query.trim());
                try {
                    writeActivityToElastic({
                        user_id: getState().userInfo.resource.id,
                        type: 'search',
                        //url: window.location.href,
                        //url: `/search?q=${response.data.disambiguation.autofill.trim().replace(' ','+')}`,
                        url: `/search?q=${response.data.disambiguation.autofill.trim()}&content_code=${response.data.disambiguation.top_result.code}&content_type=${response.data.disambiguation.top_result.index}`,
                        name: response.data.disambiguation.autofill.trim(),
                        content_code: response.data.disambiguation.top_result.code,
                        content_type: response.data.disambiguation.top_result.index,
                    });
                } catch (error) {
                    console.log('Activity Search Write - Error', error);
                }
            }

            //                 dispatch(searchKey(search_query))
        } else {
            //               dispatch(searchKey(search_query))
            //               dispatch(searchHints(Arrayhints))
        }
        return response
    }).catch(function (error) {
        console.log(error);
        return error
    });
})
