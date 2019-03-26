App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  tokensAvailable: 750000,
  tokenPrice: 1000000000000000, // in wei
  tokensSold: 0,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }

    return App.initContracts();
  },

  initContracts: function() {
    $.getJSON("ResearchTokenSale.json", function(researchTokenSale) {
      App.contracts.ResearchTokenSale = TruffleContract(researchTokenSale);
      App.contracts.ResearchTokenSale.setProvider(App.web3Provider);
      App.contracts.ResearchTokenSale.deployed().then(function(researchTokenSale) {
        console.log("Research Token Sale Address:", researchTokenSale.address);
      });
    }).done(function() {
      $.getJSON("ResearchToken.json", function(researchToken) {
        App.contracts.ResearchToken = TruffleContract(researchToken);
        App.contracts.ResearchToken.setProvider(App.web3Provider);
        App.contracts.ResearchToken.deployed().then(function(researchToken) {
          console.log("Research Token Address:", researchToken.address);
        });
        App.listenForEvents();
        return App.render();
      });
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.ResearchTokenSale.deployed().then(function(instance) {
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance.Sell({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when tokens sold
        App.render();
      });
    });
  },

  render: function() {
    if (App.loading) {
      return;
    }
    App.loading = true;

    var researchTokenSaleInstance;
    var researchTokenInstance;

    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // Load token sale contract
    App.contracts.ResearchTokenSale.deployed().then(function(instance) {
      researchokenSaleInstance = instance;
      return researchokenSaleInstance.tokenPrice();
    }).then(function(tokenPrice) {
      App.tokenPrice = tokenPrice;
      $('.token-price').html(web3.fromWei(App.tokenPrice, "ether").toNumber());
      return researchokenSaleInstance.tokensSold();
    }).then(function(tokensSold) {
      App.tokensSold = tokensSold.toNumber();
      $('.tokens-sold').html(App.tokensSold);
      $('.tokens-available').html(App.tokensAvailable);
      var progressPercent = Math.ceil(App.tokensSold / App.tokensAvailable);
      $('#progress').css('width', progressPercent + '%');

      // Load token contract
      App.contracts.DappToken.deployed().then(function(instance) {
        researchTokenInstance = instance;
        return dappTokenInstance.balanceOf(App.account);
      }).then(function(balance) {
        $('.dapp-balance').html(balance.toNumber())
      });

      App.loading = false;
      loader.hide();
      content.show();

    }).catch(function(error) {
      console.warn(error);
    });
  },

  buyTokens: function() {
    $("#content").hide();
    $("#loader").show();
    var numberOfTokens = $('#numberOfTokens').val();
    console.log("buying tokens...", numberOfTokens);
    App.contracts.ResearchTokenSale.deployed().then(function(instance) {
      return instance.buyTokens(numberOfTokens, {
        from: App.account,
        value: numberOfTokens * App.tokenPrice,
        gas: 500000 // Gas limit
      });
    }).then(function(result) {
      console.log("Bought tokens. Waiting for events...");
      $('form').trigger('reset') // reset number of tokens
      // Wait for events
    }).catch(function(err) {
      console.error(err);
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
