2014-07-22 11:28:43 +0300 Alexander Semenov 

	* Make Map.reduce 2-3 times faster. (HEAD, development)

2014-07-22 10:03:15 +0300 Alexander Semenov 

	* Replace explicit for with Util.find.

2014-07-22 09:12:36 +0300 Alexander Semenov 

	* Rollback to simple array-copying. Looking forward to RRB-based vector implementation.

2014-07-22 09:09:35 +0300 Alexander Semenov 

	* Rollback to simple array-copying. Fixes #1. Looking forward to RRB-based vector implementation.

2014-07-19 16:55:15 +0300 Alexander Semenov 

	* Update commit changelog URL.

2014-07-19 16:52:55 +0300 Alexander Semenov 

	* Update vector implementation test coverage.

2014-07-19 15:14:48 +0300 Alexander Semenov 

	* Implement iterators on Map and Vector. Make Vector much more efficient by using prefix/suffix arrays to minimize copying.

2014-07-17 21:52:10 +0300 Alexander Semenov 

	* Add Context.changed function.

2014-07-17 17:40:33 +0300 Alexander Semenov 

	* Enrich components with getPreviousState method. (tag: 0.1.5)

2014-07-16 18:11:40 +0300 Alexander Semenov 

	* Add reset state support (useful e.g. on logout).

2014-07-12 18:50:02 +0300 Alexander Semenov 

	* Make rendering in requestAnimationFrame optional. (tag: 0.1.4)

2014-07-12 16:45:49 +0300 Alexander Semenov 

	* Externalize requestAnimationFrame to batching strategy. (tag: 0.1.3)

2014-07-12 00:23:22 +0300 Alexander Semenov 

	* Render adjacent updates once. (tag: 0.1.2)

2014-07-11 23:29:48 +0300 Alexander Semenov 

	* Render on requestAnimationFrame. (tag: 0.1.1)

2014-07-10 22:02:21 +0300 Alexander Semenov 

	* Publish to NPM. Update readme. (tag: 0.1.0)

2014-07-10 20:07:20 +0300 Alexander Semenov 

	* Initial commit.

