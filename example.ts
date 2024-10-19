import { LitNodeClient, encryptString, decryptToString } from "@lit-protocol/lit-node-client";
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import * as ethers from "ethers";

const litNodeClient = new LitNodeClient({
  litNetwork: LitNetwork.DatilDev,
  debug: false
});
await litNodeClient.connect();

const ethersWallet = new ethers.Wallet(
  process.env.ETHEREUM_PRIVATE_KEY!, // Replace with your private key
  new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
);

const accessControlConditions = [
    {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "",
        parameters: [":userAddress"],
        returnValueTest: {
        comparator: "=",
        value: ethersWallet.address, // <--- The address of the wallet that can decrypt the data
        },
    },
];

const dataToEncrypt = "The answer to the universe is 42.";

const { ciphertext, dataToEncryptHash } = await encryptString(
    {
        accessControlConditions,
        dataToEncrypt,
    },
    litNodeClient
);

import {
    createSiweMessage,
    generateAuthSig,
    LitAbility,
    LitAccessControlConditionResource,
  } from "@lit-protocol/auth-helpers";
  
  const sessionSigs = await litNodeClient.getSessionSigs({
      chain: "ethereum",
      expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
      resourceAbilityRequests: [
          {
              resource: new LitAccessControlConditionResource(
                  await LitAccessControlConditionResource.generateResourceString(
                      accessControlConditions,
                      dataToEncryptHash
                  )
              ),
              ability: LitAbility.AccessControlConditionDecryption,
          },
      ],
      authNeededCallback: async ({
          uri,
          expiration,
          resourceAbilityRequests,
          }) => {
          const toSign = await createSiweMessage({
              uri,
              expiration,
              resources: resourceAbilityRequests,
              walletAddress: ethersWallet.address,
              nonce: await litNodeClient.getLatestBlockhash(),
              litNodeClient,
          });
  
          return await generateAuthSig({
              signer: ethersWallet,
              toSign,
          });
      },
  });

  const decryptionResult = await decryptToString(
    {
        chain: "ethereum",
        ciphertext,
        dataToEncryptHash,
        accessControlConditions,
        sessionSigs,
    },
    litNodeClient
  );