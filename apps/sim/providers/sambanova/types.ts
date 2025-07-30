// providers/sambanova/types.ts

/**  
 * Shape of a single SambaNova model as returned by the API  
 */
export interface Model {
    name: string          // human-readable model name
    model: string         // internal model identifier
    modified_at: string   // ISO timestamp of last update
    size: number          // model size in bytes (or your API’s unit)
    digest: string        // version hash
    details: object       // any extra metadata
  }
  
  /**  
   * Wrapper object returned by the SambaNova “list models” endpoint  
   */
  export interface ModelsObject {
    models: Model[]
  }
  