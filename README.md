# cache

usage cache

```js
import { sessionResponseCache } from 'cache';
sessionResponseCache
	.fetchTypeaheadSearchResponse(search_query, cid_entry, idx_entry)
	.then(cacheData => {
		doOnSearchResult(dispatch, cacheData.response);
		return cacheData.response;
	})
	.catch(err => {
		return axios
			.get(apiurl)
			.then(response => {
				sessionResponseCache.addTypeaheadSearchResponse(search_query, cid_entry, idx_entry, { response });
				sessionResponseCache.addSearchResponse(search_query, goal_id, -1, 1, { response });
				return response;
			})
			.catch(function(error) {
				return error;
			});
	});
```
