/* ------------------------------------------------------------------
 * Title: craigspics.js
 * Date: 8/24/2012
 * Version: 0.1
 * Author: Phil Puleo
 * Company: Phil Puleo Consulting LLC
 * Description: Logic and behaviors for the CraigsPics image browser
 *   application. Uses jQuery ajax and simple screen-scraping 
 *   techniques to retrieve and format forum posting images. Why?
 *   Because it's fun to browse postings by image and craigslist
 *   removed this functionality. Jerks.
 * Dependencies:
 *   -jQuery 1.7+
 *   - proxy.php
 *   -craigslist.org, obviously
 * Copyright 2012, Phil Puleo Consutling LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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
  
// Provide an object for extensibility and to play nice with other scripts.
window.craigspics = (function() {

  "use strict";
  
  // Create an object to return.
  var craigspics = {
    latestBatch: "", // the latest batch of posts, craigslist displays approx 30 posts per batch.
    currentPage: 1, // the current page.
    currentQuery: "", // the query used to fetch the current page.
    postArray: [] // an array of post objects {id,link,date,snippet}.
  };
  
  /* -- Custom Functions -- */
  
  // Function to load image posts from a particular forum.
  // @param query - a querystring containing the forum ID and (optionally) a pagination batch number.
  craigspics.loadPosts = function(query) {
    
    // Prepare the UI for a new page of image posts.
    $("#results").empty(); // empty out the content container since we're loading new image posts.
    $(".pagination-bottom").css("display", "none"); // hide the bottom paginiation until the posts are rendered.
    $("#messages").empty().append("Querying Craigslist..."); // show a status message.
    $(".progress .bar").css("width","20%"); // advance a progress bar so the user knows something is happening.
    $(".progress").fadeIn("fast"); // show the progress bar.
    craigspics.postArray.length = 0; // clear out the post array for reuse.
    
    // Make an ajax request to retrieve the specified page of the specified forum.
    $.ajax({ // TODO: better failure/timeout handling
      type: "POST", 
      url:"proxy.php", // cross-site scripting security disallows direct loading; use our proxy page.
      data: { qs: query }, // pass the querystring to the proxy page.
      error: function(jqXHR, textStatus, errorThrown) {
        $("#messages").empty().append("Oops! There was an error with the proxy page. Details: <br/>"+textStatus+"<br/>"+errorThrown);
        $(".progress").fadeOut("fast"); // hide the progress bar.
      } 
    }).done(function(data){
      
      // The first page of each forum displays without a batch number. For subsequent pages, we'll need a batch number.
      // Find the latest batch number for use in our pagination.
      if(craigspics.latestBatch === "") { // If there's no current batch number...
        
        try {
          // Some screen-scraping to get the latest batch number from the craigslist pager.
          var batchBase = $(data).find("a[href*='batch']").not("a[href*='batch=day']").first().attr("href");
          batchBase = batchBase.slice(batchBase.indexOf("batch=")+6);
          batchBase = batchBase.split("&")[0];
          batchBase = parseInt(batchBase, 10); // parse out the batch number.
          craigspics.latestBatch = batchBase; // store the latest batch number for use in building our own pager.
        }
        catch(error) {
          $("#messages").empty().append("Sorry, there was a problem loading the forum pages. Try another forum.");
          $(".progress").fadeOut("fast"); // hide the progress bar.
          return false;
        }
      }
      
      // Perform some sketchy screen-scraping since there's no API and craigslist makes data reuse difficult on purpose.
      try {
        var threadTable = $(data).filter("table.threads"); // Get the table containing the posts.
        var threadArray = ($(threadTable).find("td").html()).split("<br>"); // Grab the posts cell and parse posts into an array.
        
        // Loop through each post and check for the text and markup that signify an image attachment.
        for(var i=0; i<threadArray.length; i++) {
          if(threadArray[i].indexOf('<span class="R">pic</span>') !== -1) {
            
            // More screen-scraping to get each post's link and date.
            var chunk = $(threadArray[i]).filter("a"); 
            var link = chunk.attr("href"); // Grab the post link.
            var id = link.split("ID=")[1];
            var date = $(threadArray[i]).filter("font").html();
            date = date.split("<")[0];
            date = date.replace(/&nbsp;/g,""); // Grab the post date.
            craigspics.postArray.push({id:id,link:link,date:date}); // Add each post's link and date to an array for later use.
          }
        }
      }
      catch(error) {
        // do nothing, if screen-scraping fails, postArray will either be empty or incomplete. Both conditions are handled below.
      }
      
      // If we didn't find any posts with images, break the bad news to the user.
      if(craigspics.postArray.length < 1) {
        $("#messages").empty().append("Sorry, there are no images in the current batch of posts. Try older posts or another forum.");
        $(".progress").fadeOut("fast"); // hide the progress bar.
        $(".pagination-top").css("display", "block"); // show our pager.
      }
      else { // Otherwise, let's call a function to loop through all of those posting links we collected and grab the images!
        craigspics.fetchImages();
      }
    }); // End ajax call.
  }; // end loadPosts function.
  
  // Function to fetch images for a particular page.
  craigspics.fetchImages = function() {
    
    // Update the UI with our status.
    $("#messages").empty().append("Filtering Posts for Images...");
    var snip, count = 0, progress = 0; // create some temporary variables to hold HTML snippets, completion count and a progress percent. 
    var increment = Math.round(100/craigspics.postArray.length*100)/100; // set up a progress increment for each post.
    
    // Loop through the posts array and make an ajax call to retrieve the markup for each one.
    for(var j=0; j<craigspics.postArray.length;j++) {        
      (function(index) { // Wrap execution of the ajax call in a closure so we can pass in the loop index. Apparently controversial.
        
        $.ajax({ // TODO: failure/timeout handling
          type: "POST", 
          url:"proxy.php", // cross-site scripting security disallows direct loading; use our proxy page.
          data: { qs: craigspics.postArray[j].link},  // pass the querystring for each post to the proxy page.
          error: function() {
            snip = "<a href=\"#\">no image</a>"; // placeholder.
            craigspics.postArray[index].snippet = snip;  
          }
        })
        .done(function(data) {        
          try {
          // Perfom some more screen-scraping for each post to grab the img URL, build our images and links for display.
          var imageArray =[];
          $(data).find("span.quote img").each(function() { // find each image in the post.
            if(typeof($(this).attr("src")) !== "undefined") { imageArray.push($(this).attr("src")); } // make sure the image has a src attribute.
          });
          var postLink = $(data).find("a.pln").last().attr("href"); // Grab the permalink.
          
          // Build the HTML for the post.
          snip = "<div class=\"post\">";
          snip += "<a target=\"_blank\" href=\""+postLink+"\">";
          snip += "<img class=\"img-polaroid\" alt=\"post image\" src=\""+imageArray[0]+"\" />";
          snip += "</a>";
          
          if(imageArray.length > 1) { // if there was more than one image in the post, create a series of thumbnails...
            snip += "<div class=\"thumbs\">";
            for(var i=0; i<imageArray.length; i++) {
              if(i === 0) {
              snip += "<a class=\"active\" href=\""+imageArray[i]+"\"><img alt=\"NL\" src=\""+imageArray[i]+"\" /></a>";
              }
              else {
                snip += "<a href=\""+imageArray[i]+"\"><img alt=\"NL\" src=\""+imageArray[i]+"\" /></a>";
              }
            }
            snip += "</div>"; // close the thumbs container.
          }
          
          snip += "</div>"; // close the post container.

          craigspics.postArray[index].snippet = snip; // add the image snippets to an array for later rendering to the page.
          }
          catch(error) { // if something goes horribly wrong during screen-scraping, just add a placeholder.
            snip = "<a href=\"#\">no image</a>"; // placeholder.
            craigspics.postArray[index].snippet = snip;
          }
          
          progress = Math.round((progress+increment)*100)/100; // update our progress.
          $(".progress .bar").css("width",progress+"%"); // show the progress update.
          count += 1; // increment the completed fetch count.
          if(count === craigspics.postArray.length) { // Once we've finished grabbing all posts, render our page.
            craigspics.renderLinks();
          }
        }); // end .done().
        
      })(j); // end ajax closure.
    
    } // end for loop.
  };  

  // Function to render linked images to the page.
  // @param snipArray - an array of HTML snippets to render.
  craigspics.renderLinks = function() {
    
    // Build the HTML to render to the page.
    var snipHtml = "<div class=\"row-fluid\">";
    $("#messages").empty().append("Loading Images..."); // update our status.
    
    // Sort the post array by post id
    craigspics.postArray.sort(function compare(a,b) {
      if (a.id < b.id) { return 1; }
      if (a.id > b.id) { return -1; }
      return 0;
    });
    
    // Loop through the post array and break the snippets into rows of four images.
    for(var i=0; i<craigspics.postArray.length; i++) {
      if(i%4 === 0 && i !== 0) { snipHtml += "</div><div class=\"row-fluid\">"; }
      snipHtml += "<div class=\"span3\">"+craigspics.postArray[i].snippet+"</div>";
    }
    snipHtml += "</div>";
    
    // Update the UI with our retrieved images, links, date range.
    $(".pagination-top").css("display", "block"); // show our pager.
    $("#results").append(snipHtml); // render the HTML.
    $("#messages").empty(); // hide any status messages.
    $(".progress").fadeOut("fast"); // hide the progress bar since we're done.
    $("#messages").append(craigspics.postArray[0].date+" - "+craigspics.postArray[craigspics.postArray.length-1].date); // show post date range.
    $(".pagination-bottom").css("display", "block"); // show the bottom pager.
  };
 
  // Function to handle pager navigation.
  craigspics.navigate = function(page) {
    
    if(page <= 0) { // Ignore click. Nothing newer.  
      return false;
    }
    
    craigspics.currentPage = parseInt(page, 10); // set our new current page.
    
    if(page === 1) { // if we're going back to page 1, disable the "Newer" button and don't bother with the batch number.
      $(".pagination .next").addClass("disabled");
      craigspics.loadPosts(craigspics.currentQuery);
    }
    else { // otherwise, prepare the new querystring and call the loadPosts function.
      var targetBatch = craigspics.latestBatch - ((page-2) * 30); // calculate the batch number for the current page.
      var qs = craigspics.currentQuery+"&node=0&areaID=1&old=yes&batch="+targetBatch; // build the querystring.
      $(".pagination .next").removeClass("disabled"); // show the "Newer" button.
      craigspics.loadPosts(qs);
      
    }
    // Update the pager
    $(".pagination ul li").removeClass("active");
    $(".pagination ul li a[rel="+page+"]").parent().addClass("active");
  };
  
  // function to rebuild the nav when browsing bewteen sets of pages
  // @param startPage - the page to start with in the new pager nav
  // @param newPage - the new page to navigate to. Passed to the navigate function.
  craigspics.rebuildNav = function(startPage, newPage, event) {
    
    if(newPage <= 0) { // Ignore click. Nothing newer.  
      return false;
    }
    
    // For each numbered nav pager, recalculate the correct number.
    $(".navnum a").each(function(){
      var start = parseInt(startPage, 10);
      var current = parseInt($(this).attr("rel"), 10);
      // OK, so if we know the current nav page number and the new starting nav page number...
      // and we can only move up or down by 10, we just need to know whether to add or subtract
      // 10 from each nav page number. If the current is greater than the new start, subtract. Otherwise add.
      var newNav = current > start ? current-10 : current+10;
      $(this)
        .text(newNav)
        .attr("rel", newNav);
    });
    craigspics.navigate(newPage, event);
  };
  
  // -- Event Handlers -- //
  
  // Forum Dropdown Selector
  $("#forum li a").click(function() {
    $(".dropdown").removeClass("open"); // close the dropdown.
    $(".dropdown a.btn").html($(this).text()+" <span class=\"caret\"></span>"); // update the forum choice display.
    
    // Initialize our object attributes
    craigspics.currentQuery = "?act=DF&forumID="+$(this).attr("rel"); // build the querystring.
    craigspics.latestBatch = ""; // clear the latest batch number since we've chosen a new forum.
    craigspics.currentPage = 1; // set the current page back to one since we've chosen a new forum.
    
    // Reset the pagers for a new forum.
    $(".pagination-top .navnum a").each(function(index) {
      $(this).text(index+1).attr("rel", index+1);
    });
    $(".pagination-bottom .navnum a").each(function(index) {
      $(this).text(index+1).attr("rel", index+1);
    });
    $(".pagination ul li").removeClass("active");
    $(".pagination ul li a[rel="+craigspics.currentPage+"]").parent().addClass("active");
    $(".pagination .next").addClass("disabled"); // disable the "Newer" button since we'll always start on page 1.
    
    // Call our post loading function.
    craigspics.loadPosts(craigspics.currentQuery);
    return false;    
  });
  
  // Newer button
  $(".next a").on("click", function() {
    var newPage = parseInt(craigspics.currentPage - 1, 10);
    
    // If new page is in the next set of 10, rebuild the nav
    if((newPage)%10 === 0) {
      craigspics.rebuildNav(newPage - 9, newPage);
    }
    else {
      craigspics.navigate(newPage);
    }
    return false;
  });

  // Older button
  $(".previous a").on("click", function() {
    var newPage = parseInt(craigspics.currentPage + 1, 10);
    
    // If the new page is in the previous set of 10, rebuild the nav
    if((newPage-1)%10 === 0) {
      craigspics.rebuildNav(newPage, newPage);
    }
    else {
     craigspics.navigate(newPage);
    }
    return false;
  });
  
  // Numbered pages
  $(".navnum a").on("click", function() {
    var thisp = parseInt($(this).attr("rel"), 10);
    craigspics.navigate(thisp);
    return false;
  });
  
  // Thumbnail images
  $("#results").on("click", ".thumbs a", function() {
    $(this).parent().parent().find(".img-polaroid").attr("src", $(this).attr("href")); // swap out the src of the main image
    $(this).siblings("a").removeClass("active");
    $(this).addClass("active"); // highlight the active thumbnail
    return false;
  });
  
  // Return the object
  return craigspics;  

})(this); // self-execute

