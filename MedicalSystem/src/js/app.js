App = {
  web3Provider: null,
  contracts: {},

  init: function() {
    return App.initWeb3();
  },

  // Initialize Web3
  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);
    return App.initContract();
  },

  // Initialize contract
  initContract: function() {
    $.getJSON('Medical.json', function(data) {
      App.contracts.Medical = TruffleContract(data);
      App.contracts.Medical.setProvider(App.web3Provider);
      App.getPatients();
    });
    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-value', function(e){
      var $this = $(this);
      $this.button('loading');
      App.handleAddPatient(e);
    });
  },

  getPatients: function() {
    var proposalsInstance;
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      App.contracts.Medical.deployed().then(function(instance) {
        proposalsInstance = instance;
        proposalsInstance.getNumPatients.call().then(function(numProposals) {
          var wrapperProposals = $('#wrapperProposals');
          wrapperProposals.empty();
          var proposalTemplate = $('#proposalTemplate');
          for (var i=0; i<numProposals; i++) {
            proposalsInstance.getPatient.call(i).then(function(data) {
              var idx = data[0];
              proposalTemplate.find('.admissionNo').text(data[1]);
              proposalTemplate.find('.patientName').text(data[2]);
              proposalTemplate.find('.hospital').text(data[3]);
              proposalTemplate.find('.doctor').text(data[4]);
              proposalTemplate.find('.prescription').text(data[5]);
     
              wrapperProposals.append(proposalTemplate.html());
            }).catch(function(err) {
              console.log(err.message);
            });
          }
        }).catch(function(err) {
          console.log(err.message);
        });
      });
    });
    $('button').button('reset');
  },

  handleAddPatient: function(event) {
    event.preventDefault();
    var proposalInstance;
    var value1 = $('.input-value1').val();
    var value2 = $('.input-value2').val();
    var value3 = $('.input-value3').val();
    var value4 = $('.input-value4').val();
    var value5 = $('.input-value5').val();

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      App.contracts.Medical.deployed().then(function(instance) {
        proposalInstance = instance;
        return proposalInstance.addPatient(value1, value2, value3, value4, value5, {from: account});
      }).then(function(result) {
        var event = proposalInstance.CreatedPatientEvent();
        App.handleEvent(event);
        $('.input-value1').val('');
        $('.input-value2').val('');
        $('.input-value3').val('');
        $('.input-value4').val('');
        $('.input-value5').val('');
      }).catch(function(err) {
        console.log(err.message);
        $('button').button('reset');
      });
    });
  },

  handleEvent: function(event) {
    console.log('Waiting for event...');
    event.watch(function(error, result) {
      if (!error) {
        App.getPatients();
      } else {
        console.log(error);
      }
      event.stopWatching();
    });
  },

  // Initialize blockchain records page
  initBlockchainRecords: function() {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    $.getJSON('Medical.json', function(data) {
      App.contracts.Medical = TruffleContract(data);
      App.contracts.Medical.setProvider(App.web3Provider);
      App.loadBlockchainRecords();
    });
  },

  // Load and display blockchain records
  loadBlockchainRecords: function() {
    var medicalInstance;
    var blockchainRecords = $('#blockchainRecords');
    blockchainRecords.empty();

    // Get current block number
    web3.eth.getBlockNumber(function(error, currentBlock) {
      if (error) {
        console.error(error);
        return;
      }
      $('#currentBlock').text(currentBlock);
    });

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.error(error);
        return;
      }

      App.contracts.Medical.deployed().then(function(instance) {
        medicalInstance = instance;
        return medicalInstance.getNumPatients.call();
      }).then(function(numPatients) {
        $('#totalPatients').text(numPatients.toNumber());
        
        // Get all CreatedPatientEvent events
        var events = medicalInstance.CreatedPatientEvent({}, {
          fromBlock: 0,
          toBlock: 'latest'
        });

        events.get(function(error, logs) {
          if (error) {
            console.error(error);
            return;
          }

          logs.forEach(function(log) {
            // Get block information for timestamp
            web3.eth.getBlock(log.blockNumber, function(error, block) {
              if (error) {
                console.error(error);
                return;
              }

              // Get patient details
              medicalInstance.getPatient(log.args._patientId.toNumber()).then(function(patient) {
                var date = new Date(block.timestamp * 1000).toLocaleString();
                var row = $('<tr></tr>');
                
                row.append($('<td></td>').text(log.blockNumber));
                row.append($('<td></td>').text(date));
                row.append($('<td></td>').text(patient[1])); // Admission No
                row.append($('<td></td>').text(patient[2])); // Patient Name
                row.append($('<td></td>').text(patient[3])); // Hospital
                row.append($('<td></td>').text(patient[4])); // Doctor
                row.append($('<td></td>').text(patient[5])); // Prescription

                blockchainRecords.append(row);
              });
            });
          });
        });
      }).catch(function(error) {
        console.error(error);
      });
    });
  }
};

$(function() {
  $(window).load(function() {
    // Check which page we're on and initialize accordingly
    if (window.location.pathname.includes('blockchain-records.html')) {
      App.initBlockchainRecords();
    } else {
      App.init();
    }
  });
});