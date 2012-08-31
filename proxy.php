<?php
/* ------------------------------------------------------------------
 * Title: proxy.php
 * Date: 8/24/2012
 * Version: 0.1
 * Author: Phil Puleo
 * Company: Phil Puleo Consulting LLC
 * Description: A simple single-purpose proxy page used to retrieve
   craigslist forum pages.
 * Dependencies:
 *   -craigslist.org, obviously
 * Copyright 2012, Phil Puleo Consutling LLC.
 *
 * License: Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ------------------------------------------------------------------*/
 
function fetchPost() {

  if (isset($_POST["qs"])) {
    $query = htmlentities($_POST["qs"], ENT_QUOTES, "UTF-8"); // Don't do this, not safe. 
    $url = "https://forums.craigslist.org/".$query;
    $cache_file = "cache/".hash('md5', $url).".html"; // Create a unique name for the cache file.
  
    // If the file exists and was cached in the last 24 hours...
    if (file_exists($cache_file) && (filemtime($cache_file) > (time() - 86400 ))) { 
      // Get the file from the cache.
      $file = file_get_contents($cache_file);
      echo $file."[from cache]";
    }
    else {
      // Grab it and save it for next time.
      $file = file_get_contents($url);
      file_put_contents($cache_file, $file, LOCK_EX);
      echo $file;
    }
  }
}

fetchPost();
  
?>